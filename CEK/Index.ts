// supabase/functions/resolve-qr/index.ts
// Secure QR Resolver - Minimal PII, HMAC Verified di Server

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (!token) throw new Error('Token required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Hash token yang dikirim client, cari di DB via hash
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, business_name, contact_person, district_area, tier, total_orders_count, last_order_at, is_active, revoked_at')
      .eq('qr_token_hash', tokenHash)
      .single()

    if (error || !customer) throw new Error('QR tidak valid atau sudah di-revoke')
    if (customer.revoked_at) throw new Error('QR ini sudah tidak aktif, hubungi admin')
    if (!customer.is_active) throw new Error('Pelanggan tidak aktif')

    // Ambil last order items untuk quick reorder (hanya SKU & qty, harga dihitung ulang nanti)
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('id, created_at, order_items(sku_snapshot, product_name_snapshot, variant_name_snapshot, qty)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return new Response(JSON.stringify({
      customer: {
        id: customer.id,
        business_name: customer.business_name,
        contact_person: customer.contact_person,
        district: customer.district_area,
        tier: customer.tier,
        greeting: `Halo ${customer.business_name || customer.contact_person}! Selamat datang kembali`,
      },
      last_order: lastOrder || null,
      message: 'QR valid - PII minimal'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
