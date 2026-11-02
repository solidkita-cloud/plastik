# PRD v1.1 - Web Toko Plastik & Kemasan Modern
**Versi:** 1.1.0 - REVISI P0 SECURITY (Post-Audit Gemini + Meta + GPT)
**Tanggal:** 3 November 2026
**Status:** READY FOR BUILD - Milestone 2
**Base PRD:** PRD_TOKO_PLASTIK.md v1.0.0-PROPOSAL
**Audit Reference:** Evaluasi_PRD_Toko_Plastik_Kemasan.pdf (GPT) - Score 8.0/10

### Changelog v1.0 -> v1.1
1.  **SECURITY P0 FIX:** HMAC-SHA256 dipindah 100% ke Supabase Edge Function. Secret tidak pernah di bundle JS.
2.  **RLS FIX:** Hapus `USING (true)` pada customers & orders. Akses via RPC & service_role only.
3.  **DATA MODEL v2:** Product -> Variant -> VariantUnit -> UnitPricing + Inventory Ledger + Price History. Pisahkan harga vs stok vs snapshot.
4.  **DUAL-ENGINE CONTRACT:** LocalStorage diganti IndexedDB (Dexie). Kontrak sync: retry, idempotency, conflict resolution, expiry draft.
5.  **VISUAL FINAL:** Hybrid Clean Blue #0284C7 Primary + Wholesale Orange #EA580C CTA + Eco Green #059669 Badge.

---

## 1. Arsitektur Keamanan Final (Server-Side Truth)

**Prinsip Emas:** WhatsApp adalah kanal komunikasi, BUKAN sumber kebenaran transaksi. Database server adalah sumber kebenaran.

### 1.1 Flow Transaksi Aman
```
[CLIENT] Cart -> [EDGE] POST /create-order-and-sign -> 
[SERVER] Validasi SKU aktif, harga resmi, hitung ulang total, 
INSERT orders + order_items (snapshot harga), 
Generate HMAC-SHA256(payload_kanonis, SERVER_SECRET) -> 
Return {order_number, verification_code: 8 char} -> 
[CLIENT] buka wa.me/?text=Order%20TP-2026-001%20Total%20...%20[VERIF: A8K2P9]
```

Payload kanonis untuk HMAC (disimpan di server):
```
order_id | created_at (rounded 15m) | customer_qr_token | items:[{sku,variant_id,unit_id,qty,price_at_transaction}] | subtotal | discount | total | shipping_method
```

### 1.2 Anti-Tamper & QR Security
- QR Token: Nanoid 21 char (128-bit entropy) + HMAC-SHA256 signature. Simpan `qr_token_hash` di DB (SHA256), bukan plaintext, agar bisa di-revoke.
- Token Rotation: Admin bisa revoke & regenerate. Audit log scan.
- PII Shield: resolve-qr hanya return {business_name, district, tier, last_order_summary} - TIDAK return alamat lengkap & HP. Alamat lengkap hanya diambil saat Edge Function create-order butuh validasi.

### 1.3 XSS & Injection
- React auto-escape untuk teks biasa. DOMPurify hanya untuk render HTML tidak terpercaya (deskripsi produk dari WYSIWYG).
- WhatsApp payload wajib `encodeURIComponent` + Zod validation di Edge Function.

## 2. Data Model v2 - Multi-Satuan Grosir yang Akurat

### 2.1 Konsep Baru
Setiap satuan punya konversi berbeda per SKU. Harga grosir tidak selalu perkalian eceran.

```
PRODUCT (induk: Thinwall Rectangle)
  -> VARIANT (650ml, dimensi, material)
    -> VARIANT_UNIT (Pcs, Pak, Ikat, Dus) 
       base_multiplier = jumlah pcs dalam unit ini
       min_order_qty, step_qty, is_default
    -> UNIT_PRICING (harga per unit + customer tier)
       price, effective_from, effective_to, customer_tier
```

### 2.2 Inventory Ledger
Semua transaksi masuk/keluar dikonversi ke satuan dasar (pcs).
`10 dus x 500 pcs = 5000 pcs stok dasar. Beli 2 pak x 25 pcs = 50 pcs. Stok = 4950 pcs.`

### 2.3 Snapshot Transaksi
Tabel `order_items` menyimpan `price_at_transaction`, `unit_at_transaction`, `multiplier_at_transaction` agar histori tidak berubah saat harga naik.

## 3. Dual-Engine Offline-First Contract

| Data | Storage | Sumber Kebenaran |
| :--- | :--- | :--- |
| Katalog, varian, harga cache | IndexedDB (Dexie) | Supabase (sync) |
| Keranjang & draft offline | IndexedDB | Local (pending sync) |
| Pesanan terkonfirmasi | PostgreSQL | Server |
| Harga & stok resmi | PostgreSQL | Server |
| Auth Owner/Staff | Supabase Auth | Server |

Kontrak Sync:
- Draft disimpan dengan `idempotency_key = nanoid + timestamp`
- Saat online: POST ke Edge Function dengan idempotency key. Server tolak duplikat.
- Conflict: Jika harga/stok berubah saat offline, server return `409 CONFLICT` dengan harga terbaru. UI minta konfirmasi ulang.
- Expiry: Draft offline expired 24 jam. Label UI: "Harga terakhir sync: 2 jam lalu - Perlu validasi"

## 4. Visual Design System - Final Decision

**Keputusan:** Hybrid Clean Blue + Wholesale Orange

```js
// tailwind.config.js tokens
colors: {
  primary: '#0284C7', // Ocean Blue - Brand, Nav, Border, Hard Shadow Base
  accent: '#EA580C',  // Tangerine - CTA Checkout, Sticky Cart, Badge Hemat Grosir
  eco: '#059669',     // Emerald - Badge Kraft, Paper, FoodGrade
  background: '#F1F5F9', // Slate 100 - Body
  surface: '#FFFFFF',
  ink: '#0F172A', // Border stroke 2.5px, Hard Shadow 6px 6px 0px
}
Typography: Plus Jakarta Sans (Head), Outfit (Display)
Border: 2.5px solid ink
Shadow: 6px 6px 0px ink
Touch Target: min 48x48px, Sticky Cart di bottom thumb zone
```

Rationale: Biru = trust higienis food-grade (70% B2B warung), Oranye = urgency grosir murah (CTA conversion), Hijau = eco status.

## 5. Prioritas Implementasi (dari Audit GPT)

P0 - SECURITY: Fix RLS, Edge Function HMAC, Supabase Auth Owner, QR revoke/regenerate
P1 - DATABASE: Schema v2, unit conversion, price history, inventory ledger, order_items
P2 - OFFLINE: IndexedDB, Dexie, sync queue, conflict policy
P3 - UX: Hybrid Blue/Orange, Fast Search Flat Index, Smart QR Re-Order, Paket Starter Builder
P4 - PROD: SSG untuk SEO kategori/produk, Stock Reservation, Audit Log, Load Test, Core Web Vitals LCP <1.2s

## 6. Roadmap Milestone
M2: Init Project + Schema v2 + RLS + Edge Functions
M3: Core Catalog Engine + Fast Search (Flat Index <50ms) + Variant Modal
M4: Sticky WhatsApp Cart + Tier Calculator + Smart QR CRM
M5: Owner Dashboard + Inventory + A4/Thermal QR Generator
M6: Security Hardening + DOMPurify Audit + Sync Contract Testing
