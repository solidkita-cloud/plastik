// Flat Index untuk Instant Search <50ms - Solusi dari Gemini + GPT
import Dexie from 'dexie'

export interface FlatCatalogItem {
  product_id: string
  product_name: string
  material: string
  variant_id: string
  variant_name: string
  sku: string
  dimension_detail?: string
  unit_id: string
  unit_code: string
  unit_name: string
  base_multiplier: number
  price: number
  price_per_pcs: number
  search_key: string
  tags?: string[]
}

class CatalogDB extends Dexie {
  flat_catalog!: Dexie.Table<FlatCatalogItem, string>
  constructor() {
    super('TokoPlastikCatalog')
    this.version(1).stores({
      flat_catalog: 'unit_id, product_id, variant_id, sku, *search_key'
    })
  }
}

export const db = new CatalogDB()

export function buildFlatIndex(products: any[]): FlatCatalogItem[] {
  return products.flatMap(p => 
    (p.product_variants || []).flatMap((v: any) => 
      (v.variant_units || []).flatMap((u: any) => {
        const pricing = (u.unit_pricing || [])[0]
        if (!pricing) return []
        return {
          product_id: p.id,
          product_name: p.name,
          material: p.material,
          variant_id: v.id,
          variant_name: v.name,
          sku: v.sku,
          dimension_detail: v.dimension_detail,
          unit_id: u.id,
          unit_code: u.unit_code,
          unit_name: u.unit_name,
          base_multiplier: Number(u.base_multiplier),
          price: Number(pricing.price),
          price_per_pcs: Number(pricing.price) / Number(u.base_multiplier),
          search_key: `${p.name} ${v.name} ${v.sku} ${v.dimension_detail || ''} ${p.material}`.toLowerCase(),
          tags: p.tags
        }
      })
    )
  )
}

export async function instantSearch(query: string, limit = 20): Promise<FlatCatalogItem[]> {
  if (!query) return db.flat_catalog.limit(limit).toArray()
  const q = query.toLowerCase()
  return db.flat_catalog.filter(item => item.search_key.includes(q)).limit(limit).toArray()
}
