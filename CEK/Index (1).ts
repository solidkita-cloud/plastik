// supabase/functions/create-order-and-sign/index.ts
// P0 SECURITY FIX - HMAC di SERVER, bukan di client
// Deno Edge Function untuk Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { nanoid } from "https://esm.sh/nanoid@5"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // service_role bypass RLS
    )

    const { items, customer_qr_token, delivery_method, idempotency_key, customer_snapshot } = await req.json()
    // items: [{variant_id, unit_id, qty}]

    // 1. Idempotency check (untuk offline sync)
    if (idempotency_key) {
      const { data: existing } = await supabase.from('orders').select('*').eq('idempotency_key', idempotency_key).single()
      if (existing) {
        return new Response(JSON.stringify({ 
          order: existing, 
          message: 'Order already exists - idempotent' 
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // 2. VALIDASI HARGA DI SERVER - Sumber Kebenaran
    let subtotal = 0
    let total_weight_grams = 0
    const orderItemsSnapshot = []

    for (const item of items) {
      // Ambil harga resmi dari DB
      const { data: unit, error } = await supabase
        .from('variant_units')
        .select(`
          id, unit_name, base_multiplier,
          product_variants!inner(id, sku, name, base_pcs_weight_grams, products!inner(name)),
          unit_pricing!inner(price)
        `)
        .eq('id', item.unit_id)
        .eq('is_active', true)
        .single()

      if (error || !unit) throw new Error(`SKU tidak valid atau tidak aktif: ${item.unit_id}`)

      // Ambil harga terbaru yang aktif
      const officialPrice = unit.unit_pricing[0].price // simplifikasi, ambil yang retail
      const lineSubtotal = officialPrice * item.qty

      subtotal += lineSubtotal
      total_weight_grams += (unit.product_variants.base_pcs_weight_grams * Number(unit.base_multiplier) * item.qty)

      orderItemsSnapshot.push({
        variant_id: item.variant_id,
        unit_id: item.unit_id,
        sku_snapshot: unit.product_variants.sku,
        product_name_snapshot: unit.product_variants.products.name,
        variant_name_snapshot: unit.product_variants.name,
        unit_name_snapshot: unit.unit_name,
        qty: item.qty,
        base_multiplier_at_transaction: unit.base_multiplier,
        price_at_transaction: officialPrice,
        subtotal: lineSubtotal,
      })
    }

    const total = subtotal // TODO: tambah diskon, ongkir

    // 3. Generate Order Number & Verification
    const order_id = `ord_${nanoid(12)}`
    const order_number = `TP-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`
    
    // Payload kanonis untuk HMAC
    const timestampRounded = Math.floor(Date.now() / (15 * 60 * 1000)) // rounded per 15 menit
    const canonicalPayload = JSON.stringify({
      order_id,
      order_number,
      timestampRounded,
      items: orderItemsSnapshot.map(i => ({ sku: i.sku_snapshot, qty: i.qty, price: i.price_at_transaction })),
      total,
      delivery_method,
      customer_qr_token: customer_qr_token || 'guest'
    })

    // HMAC-SHA256 dengan SERVER SECRET (tidak pernah ke client)
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(Deno.env.get('HMAC_SECRET')!),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(canonicalPayload))
    const hashArray = Array.from(new Uint8Array(signatureBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const verification_code = hashHex.substring(0, 8).toUpperCase() // 8 char untuk WA

    // 4. INSERT ORDER
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      id: order_id,
      order_number,
      idempotency_key: idempotency_key || `idem_${nanoid(16)}`,
      customer_name_snapshot: customer_snapshot?.name || 'Guest',
      customer_phone_snapshot: customer_snapshot?.phone || '-',
      delivery_method,
      subtotal,
      total_amount: total,
      total_weight_kg: total_weight_grams / 1000,
      status: 'pending',
      payment_status: 'unpaid',
      verification_hash: hashHex,
      verification_code,
    }).select().single()

    if (orderError) throw orderError

    // Insert order_items
    const itemsToInsert = orderItemsSnapshot.map(i => ({ ...i, order_id }))
    await supabase.from('order_items').insert(itemsToInsert)

    // Inventory reservation (optional)
    // for (const i of orderItemsSnapshot) {
    //   await supabase.from('inventory_ledger').insert({
    //     variant_id: i.variant_id,
    //     movement_type: 'RESERVATION',
    //     qty_base_pcs: -1 * (i.qty * Number(i.base_multiplier_at_transaction)),
    //     reference_id: order_id
    //   })
    // }

    return new Response(JSON.stringify({
      order_number,
      verification_code,
      verification_hash: hashHex, // full hash disimpan server, code pendek untuk WA
      total,
      subtotal,
      whatsapp_text: generateWhatsAppText(order_number, verification_code, orderItemsSnapshot, total, delivery_method)
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})

function generateWhatsAppText(order_number: string, code: string, items: any[], total: number, delivery: string) {
  let text = `Halo Admin Toko Plastik! Saya mau pesan:\n\n`
  text += `*Order:* ${order_number}\n`
  items.forEach((item, idx) => {
    text += `${idx+1}. ${item.product_name_snapshot} ${item.variant_name_snapshot} - ${item.unit_name_snapshot} x ${item.qty} = Rp${(item.subtotal).toLocaleString('id-ID')}\n`
  })
  text += `\n*Metode:* ${delivery}\n`
  text += `*Total:* Rp${total.toLocaleString('id-ID')}\n`
  text += `\n[VERIF: ${code}] - Validasi di dashboard kasir\n`
  text += `Ref: ${order_number}`
  return text
}
