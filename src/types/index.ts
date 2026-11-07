// Type definitions for Toko Plastik & Kemasan (PlastiPro)

export type CustomerTier = 'retail' | 'langganan_warung' | 'distributor';

export type StockStatus = 'ready' | 'limited' | 'preorder' | 'out_of_stock';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_name: string;
  sort_order: number;
}

export interface VariantUnit {
  id: string;
  variant_id: string;
  unit_code: 'PCS' | 'PAK' | 'IKAT' | 'DUS' | 'ROLL' | 'RIM' | 'KG';
  unit_name: string; // e.g. "Pcs", "Pak (Isi 25)", "Dus/Karton (Isi 500)"
  base_multiplier: number; // e.g. 1, 25, 500
  price: number; // Default retail price
  cogs_price?: number; // Cost of goods sold / Harga Modal Pabrik
  wholesale_price?: number; // Optional wholesale tier price
  min_order_qty: number;
  step_qty: number;
  is_default: boolean;
  badge_label?: string; // e.g. "Paling Laris", "Harga Termurah", "Hemat Rp 45.000"
  weight_grams?: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string; // e.g. "500 ml", "650 ml", "16 oz", "Ukuran 24"
  sku: string;
  dimension_detail?: string; // e.g. "17.5 x 12 x 5 cm"
  thickness_micron?: number;
  color?: string;
  stock_status: StockStatus;
  stock_qty?: number; // Sisa stok fisik (dalam pcs / unit dasar)
  min_stock_alert?: number; // Ambang batas stok menipis
  base_pcs_weight_grams: number;
  units: VariantUnit[];
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  material: 'PP' | 'PE' | 'HDPE' | 'PET' | 'Paper' | 'Kraft' | 'Biodegradable' | 'Other';
  food_grade: boolean;
  microwave_safe: boolean;
  freezer_safe: boolean;
  description: string;
  image_url: string;
  tags: string[];
  is_featured: boolean;
  badge?: 'Best Seller' | 'Eco Friendly' | 'Promo' | 'Baru';
  variants: ProductVariant[];
}

export interface CartItem {
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  unit_id: string;
  unit_name: string;
  unit_code: string;
  base_multiplier: number;
  sku: string;
  price: number;
  cogs_price?: number;
  qty: number;
  weight_grams: number;
}

export interface CustomerProfile {
  id: string;
  qr_token: string;
  business_name: string;
  contact_person: string;
  phone_number: string;
  delivery_address: string;
  district_area: string;
  tier: CustomerTier;
  total_orders_count?: number;
  last_order?: {
    order_number: string;
    items_summary: string;
    items: CartItem[];
  };
}

// Sales & Analytics Types
export interface OrderItemRecord {
  product_id: string;
  product_name: string;
  category_id?: string;
  variant_id: string;
  variant_name: string;
  unit_code: string;
  unit_name: string;
  qty: number;
  sell_price: number;
  cogs_price: number; // Modal / HPP
  subtotal: number;
  profit: number; // (sell_price - cogs_price) * qty
}

export interface SalesOrderPayment {
  id: string;
  created_at: string;
  amount: number;
  method: 'cash' | 'transfer';
  notes?: string;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  created_at: string; // ISO 8601 string
  customer_name: string;
  customer_phone: string;
  customer_id?: string;
  delivery_method: string;
  items: OrderItemRecord[];
  total_qty: number;
  total_omzet: number;
  total_cogs: number;
  total_profit: number;
  profit_margin_pct: number;
  status: 'completed' | 'pending' | 'cancelled';
  source: 'whatsapp_checkout' | 'pos_thermal' | 'qr_reorder';
  // Payment & Tempo Details
  payment_method?: 'cash' | 'transfer' | 'tempo';
  payment_status?: 'paid' | 'unpaid' | 'partial';
  due_date?: string; // Tanggal jatuh tempo
  amount_paid?: number; // Total nominal yang sudah dibayar
  remaining_balance?: number; // Sisa tagihan piutang
  payment_history?: SalesOrderPayment[];
}

// Manajemen Stok & Mutasi
export interface StockMovement {
  id: string;
  created_at: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  type: 'in_restock' | 'out_sale' | 'adjustment';
  qty_change: number; // e.g. +1000 atau -50 pcs
  unit_name?: string;
  resulting_stock: number;
  notes: string;
  order_number?: string;
}

// Buku Kas & Pengeluaran Operasional
export type ExpenseCategory = 'operasional' | 'transport' | 'gaji' | 'utilitas' | 'pembelian_stok' | 'lainnya';

export interface ExpenseRecord {
  id: string;
  created_at: string; // ISO 8601 string
  category: ExpenseCategory;
  category_name: string;
  title: string;
  amount: number;
  notes?: string;
}

