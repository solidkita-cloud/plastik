-- SCHEMA v2 - TOKO PLASTIK & KEMASAN (Post-Audit GPT P0+P1)
-- File: supabase/schema_v2.sql
-- Revisi: Fix RLS, Pisah Unit & Pricing, Inventory Ledger, Price History

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. KATEGORI
CREATE TABLE categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon_name VARCHAR(50) DEFAULT 'Package',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUK INDUK
CREATE TABLE products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(50) REFERENCES categories(id) ON DELETE SET NULL,
    material VARCHAR(50) DEFAULT 'PP',
    food_grade BOOLEAN DEFAULT TRUE,
    microwave_safe BOOLEAN DEFAULT FALSE,
    freezer_safe BOOLEAN DEFAULT FALSE,
    description TEXT,
    image_url TEXT,
    gallery_urls JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VARIAN (Ukuran/Dimensi)
CREATE TABLE product_variants (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- '650 ml'
    sku VARCHAR(100) UNIQUE NOT NULL,
    dimension_detail VARCHAR(100),
    thickness_micron INT,
    color VARCHAR(50) DEFAULT 'Bening Transparan',
    stock_status VARCHAR(20) DEFAULT 'ready',
    base_pcs_weight_grams INT DEFAULT 10, -- berat 1 pcs untuk kalkulasi ongkir akurat
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);

-- 4. VARIANT UNIT (Pcs, Pak, Ikat, Dus) - Pisah dari Pricing
CREATE TABLE variant_units (
    id VARCHAR(64) PRIMARY KEY,
    variant_id VARCHAR(64) REFERENCES product_variants(id) ON DELETE CASCADE,
    unit_code VARCHAR(20) NOT NULL, -- 'PCS', 'PAK', 'IKAT', 'DUS'
    unit_name VARCHAR(50) NOT NULL, -- 'Pcs', 'Pak (Isi 25)', 'Dus/Karton'
    base_multiplier DECIMAL(10,2) NOT NULL DEFAULT 1, -- jumlah pcs dalam unit ini
    min_order_qty INT DEFAULT 1,
    step_qty INT DEFAULT 1,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    badge_label VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(variant_id, unit_code),
    CONSTRAINT check_multiplier_positive CHECK (base_multiplier > 0),
    CONSTRAINT check_min_order_positive CHECK (min_order_qty > 0)
);
CREATE INDEX idx_units_variant_id ON variant_units(variant_id);

-- 5. UNIT PRICING (Harga bisa beda per tier pelanggan & periode)
CREATE TABLE unit_pricing (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) REFERENCES variant_units(id) ON DELETE CASCADE,
    price DECIMAL(12,2) NOT NULL,
    customer_tier VARCHAR(30) DEFAULT 'retail', -- retail, langganan_warung, distributor
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ DEFAULT NULL, -- NULL = masih berlaku
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT check_price_nonnegative CHECK (price >= 0)
);
CREATE INDEX idx_pricing_unit_id ON unit_pricing(unit_id);
CREATE INDEX idx_pricing_effective ON unit_pricing(effective_from, effective_to);

-- 6. PRICE HISTORY (Audit perubahan harga)
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id VARCHAR(64) REFERENCES variant_units(id) ON DELETE CASCADE,
    old_price DECIMAL(12,2),
    new_price DECIMAL(12,2),
    changed_by VARCHAR(100),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INVENTORY LEDGER (Semua mutasi dalam satuan dasar pcs)
CREATE TABLE inventory_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id VARCHAR(64) REFERENCES product_variants(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT', 'RESERVATION'
    qty_base_pcs DECIMAL(12,2) NOT NULL, -- qty dalam pcs
    reference_id VARCHAR(64), -- order_id atau adjustment_id
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ledger_variant_id ON inventory_ledger(variant_id);

-- 8. CUSTOMERS (QR CRM - No Public SELECT)
CREATE TABLE customers (
    id VARCHAR(64) PRIMARY KEY,
    qr_token_hash VARCHAR(128) UNIQUE NOT NULL, -- SHA256 dari token asli, bukan token plaintext
    qr_token_plain_hint VARCHAR(8), -- 8 char terakhir untuk admin cari manual
    business_name VARCHAR(150),
    contact_person VARCHAR(100) NOT NULL,
    phone_number_encrypted TEXT, -- encrypted atau masking
    delivery_address_encrypted TEXT,
    district_area VARCHAR(100),
    tier VARCHAR(30) DEFAULT 'retail',
    total_orders_count INT DEFAULT 0,
    total_spent DECIMAL(14,2) DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ORDERS (No Public SELECT)
CREATE TABLE orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL, -- TP-2026-0001
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(128) UNIQUE, -- untuk cegah duplikat offline sync
    customer_name_snapshot VARCHAR(100) NOT NULL,
    customer_phone_snapshot VARCHAR(30) NOT NULL,
    delivery_method VARCHAR(50) NOT NULL,
    delivery_address_snapshot TEXT,
    subtotal DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    total_weight_kg DECIMAL(8,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pending', -- pending, confirmed, shipped, completed, cancelled, expired, rejected
    payment_status VARCHAR(30) DEFAULT 'unpaid', -- unpaid, partial, paid, refunded
    verification_hash VARCHAR(128) NOT NULL, -- HMAC-SHA256 full
    verification_code VARCHAR(8) NOT NULL, -- 8 char untuk tampil di WA
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ORDER ITEMS (Snapshot harga saat transaksi)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64),
    variant_id VARCHAR(64),
    unit_id VARCHAR(64),
    sku_snapshot VARCHAR(100) NOT NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    variant_name_snapshot VARCHAR(100) NOT NULL,
    unit_name_snapshot VARCHAR(50) NOT NULL,
    qty INT NOT NULL,
    base_multiplier_at_transaction DECIMAL(10,2) NOT NULL,
    price_at_transaction DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 11. AUDIT LOG
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. FLAT CATALOG MATERIALIZED VIEW untuk Frontend <50ms Search
CREATE MATERIALIZED VIEW flat_catalog AS
SELECT 
  p.id as product_id, p.name as product_name, p.material, p.food_grade, p.microwave_safe, p.is_featured, p.tags,
  v.id as variant_id, v.name as variant_name, v.sku, v.dimension_detail, v.stock_status,
  u.id as unit_id, u.unit_code, u.unit_name, u.base_multiplier, u.is_default as unit_is_default,
  pr.price, pr.customer_tier,
  (pr.price / NULLIF(u.base_multiplier,0)) as price_per_pcs,
  (p.name || ' ' || v.name || ' ' || COALESCE(v.sku,'') || ' ' || COALESCE(v.dimension_detail,'') || ' ' || p.material) as search_key
FROM products p
JOIN product_variants v ON v.product_id = p.id AND v.is_active = true
JOIN variant_units u ON u.variant_id = v.id AND u.is_active = true
JOIN unit_pricing pr ON pr.unit_id = u.id AND pr.is_active = true AND (pr.effective_to IS NULL OR pr.effective_to > NOW())
WHERE p.is_active = true;

CREATE INDEX idx_flat_search ON flat_catalog USING GIN (to_tsvector('indonesian', search_key));
CREATE INDEX idx_flat_product_id ON flat_catalog(product_id);

-- RLS ENABLE
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES - SECURE (FIX DARI GPT AUDIT)

-- Public hanya boleh baca yang aktif
CREATE POLICY "Public Read Categories Active" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Products Active" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Variants Active" ON product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Units Active" ON variant_units FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Pricing Active" ON unit_pricing FOR SELECT USING (is_active = true);

-- Customers & Orders: TIDAK ADA public SELECT/INSERT. Hanya service_role via Edge Function
-- Ini menutup lubang SELECT USING (true) dari v1.0
CREATE POLICY "No Public Access Customers" ON customers FOR ALL USING (false);
CREATE POLICY "No Public Access Orders" ON orders FOR ALL USING (false);
CREATE POLICY "No Public Access OrderItems" ON order_items FOR ALL USING (false);

-- Untuk service_role bypass RLS otomatis, jadi Edge Function dengan service_role bisa INSERT/SELECT
