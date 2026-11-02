import Dexie, { Table } from 'dexie';
import { Product } from '../types';

export interface FlatCatalogItem {
  id: string; // unique composite key: `${product_id}_${variant_id}_${unit_id}`
  product_id: string;
  product_name: string;
  category_id: string;
  material: string;
  variant_id: string;
  variant_name: string;
  sku: string;
  dimension_detail?: string;
  unit_id: string;
  unit_code: string;
  unit_name: string;
  base_multiplier: number;
  price: number;
  price_per_pcs: number;
  badge_label?: string;
  search_key: string;
  tags: string[];
}

export class CatalogDatabase extends Dexie {
  flat_catalog!: Table<FlatCatalogItem, string>;

  constructor() {
    super('PlastiProCatalogDB');
    this.version(1).stores({
      flat_catalog: 'id, product_id, variant_id, sku, category_id, search_key'
    });
  }
}

export const catalogDb = new CatalogDatabase();

export function buildFlatCatalog(products: Product[]): FlatCatalogItem[] {
  const items: FlatCatalogItem[] = [];

  for (const p of products) {
    for (const v of p.variants) {
      for (const u of v.units) {
        const pricePerPcs = u.base_multiplier > 0 ? u.price / u.base_multiplier : u.price;
        const searchKey = `${p.name} ${v.name} ${v.sku} ${v.dimension_detail || ''} ${p.material} ${u.unit_name} ${p.tags.join(' ')}`.toLowerCase();
        
        items.push({
          id: `${p.id}_${v.id}_${u.id}`,
          product_id: p.id,
          product_name: p.name,
          category_id: p.category_id,
          material: p.material,
          variant_id: v.id,
          variant_name: v.name,
          sku: v.sku,
          dimension_detail: v.dimension_detail,
          unit_id: u.id,
          unit_code: u.unit_code,
          unit_name: u.unit_name,
          base_multiplier: u.base_multiplier,
          price: u.price,
          price_per_pcs: Math.round(pricePerPcs),
          badge_label: u.badge_label,
          search_key: searchKey,
          tags: p.tags
        });
      }
    }
  }

  return items;
}

export async function initCatalogIndex(products: Product[]) {
  try {
    const flatItems = buildFlatCatalog(products);
    await catalogDb.flat_catalog.clear();
    await catalogDb.flat_catalog.bulkPut(flatItems);
  } catch (err) {
    console.warn('Gagal inisialisasi IndexedDB Dexie:', err);
  }
}

// Instant Search < 50ms over all indexed variants
export async function searchFlatCatalog(query: string, limit = 25): Promise<FlatCatalogItem[]> {
  if (!query || query.trim() === '') {
    return catalogDb.flat_catalog.limit(limit).toArray();
  }

  const q = query.toLowerCase().trim();
  return catalogDb.flat_catalog
    .filter(item => item.search_key.includes(q))
    .limit(limit)
    .toArray();
}
