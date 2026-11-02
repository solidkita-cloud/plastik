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
