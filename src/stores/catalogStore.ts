import { create } from 'zustand';
import { Product, StockMovement, StockStatus } from '../types';
import { INITIAL_PRODUCTS } from '../lib/constants';
import { initCatalogIndex } from '../lib/catalogDb';

export interface RestockOptions {
  unitCostRp?: number; // Harga beli / kulakan per 1 pcs / unit dasar
  updateUnitCogs?: boolean; // Perbarui HPP beli pada semua satuan varian secara proporsional
}

interface CatalogState {
  products: Product[];
  stockMovements: StockMovement[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  restockVariant: (
    productId: string,
    variantId: string,
    addedQty: number,
    notes?: string,
    options?: RestockOptions
  ) => void;
  deductStock: (items: { variant_id: string; qty: number; base_multiplier: number }[], orderNumber?: string) => void;
  restoreStock: (
    items: { variant_id: string; qty: number; base_multiplier?: number }[],
    orderNumber?: string,
    reason?: string
  ) => void;
  resetDefaultCatalog: () => void;
}

const STORAGE_KEY = 'plastipro_custom_catalog_v2';
const MOVEMENTS_STORAGE_KEY = 'plastipro_stock_movements_v1';

export function resolveUnitCogsPrice(
  products: Product[],
  variantId: string,
  unitId: string | undefined,
  sellPrice: number,
  explicitCogs?: number
): number {
  if (explicitCogs !== undefined && explicitCogs > 0) {
    return Math.round(explicitCogs);
  }
  for (const p of products) {
    const v = p.variants?.find((vr) => vr.id === variantId);
    if (!v) continue;
    const u = (unitId ? v.units?.find((un) => un.id === unitId) : undefined) || v.units?.[0];
    if (u?.cogs_price && u.cogs_price > 0) {
      return Math.round(u.cogs_price);
    }
  }
  return Math.round(sellPrice * 0.72);
}

export function normalizeProductData(p: Product): Product {
  const defaultMatch = INITIAL_PRODUCTS.find((init) => init.id === p.id);
  const imageUrl =
    defaultMatch && (p.image_url?.startsWith('data:image/svg') || !p.image_url)
      ? defaultMatch.image_url
      : p.image_url;

  const updatedVariants = (p.variants || []).map((v) => {
    const defaultQty = v.stock_qty ?? 1500;
    const minAlert = v.min_stock_alert ?? 200;
    const status: StockStatus =
      defaultQty <= 0 ? 'out_of_stock' : defaultQty <= minAlert ? 'limited' : 'ready';

    const updatedUnits = (v.units || []).map((u) => ({
      ...u,
      cogs_price: u.cogs_price && u.cogs_price > 0 ? Math.round(u.cogs_price) : Math.round(u.price * 0.72)
    }));

    return {
      ...v,
      stock_qty: defaultQty,
      min_stock_alert: minAlert,
      stock_status: status,
      units: updatedUnits
    };
  });

  return { ...p, image_url: imageUrl, variants: updatedVariants };
}

function loadInitialCatalog(): Product[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: Product) => normalizeProductData(p));
      }
    }
  } catch (err) {
    console.warn('Gagal membaca custom catalog dari localStorage:', err);
  }

  return INITIAL_PRODUCTS.map((p) => normalizeProductData(p));
}

function loadInitialMovements(): StockMovement[] {
  try {
    const saved = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Gagal membaca stock movements:', err);
  }
  return [];
}

export function saveCatalog(products: Product[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    initCatalogIndex(products);
  } catch (err) {
    console.warn('Gagal menyimpan custom catalog ke localStorage:', err);
  }
}

export function saveMovements(movements: StockMovement[]) {
  try {
    localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(movements));
  } catch (err) {
    console.warn('Gagal menyimpan stock movements:', err);
  }
}

function adjustVariantStock(
  products: Product[],
  items: { variant_id: string; qty: number; base_multiplier?: number }[],
  direction: -1 | 1,
  movementType: StockMovement['type'],
  defaultNote: string,
  orderNumber?: string
): { updatedProducts: Product[]; movementsToAdd: StockMovement[] } {
  const movementsToAdd: StockMovement[] = [];

  const updatedProducts = products.map((p) => {
    let productModified = false;

    const updatedVariants = p.variants.map((v) => {
      const matchingItems = items.filter((it) => it.variant_id === v.id);
      if (matchingItems.length === 0) return v;

      productModified = true;
      const totalBaseUnits = matchingItems.reduce((sum, it) => {
        // Fallback ke multiplier unit default varian jika tidak tercatat
        const mult = it.base_multiplier || v.units?.[0]?.base_multiplier || 1;
        return sum + it.qty * mult;
      }, 0);

      const cur = v.stock_qty ?? 1000;
      const newStock =
        direction < 0 ? Math.max(0, cur - totalBaseUnits) : cur + totalBaseUnits;
      const minAlert = v.min_stock_alert ?? 200;
      const newStatus: StockStatus =
        newStock <= 0 ? 'out_of_stock' : newStock <= minAlert ? 'limited' : 'ready';

      movementsToAdd.push({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        created_at: new Date().toISOString(),
        product_id: p.id,
        product_name: p.name,
        variant_id: v.id,
        variant_name: v.name,
        type: movementType,
        qty_change: direction * totalBaseUnits,
        resulting_stock: newStock,
        notes: defaultNote,
        order_number: orderNumber
      });

      return { ...v, stock_qty: newStock, stock_status: newStatus };
    });

    return productModified ? { ...p, variants: updatedVariants } : p;
  });

  return { updatedProducts, movementsToAdd };
}

export const useCatalogStore = create<CatalogState>((set) => {
  const initial = loadInitialCatalog();
  const initialMovements = loadInitialMovements();
  initCatalogIndex(initial);

  return {
    products: initial,
    stockMovements: initialMovements,

    addProduct: (newProduct) => {
      const normalized = normalizeProductData(newProduct);
      set((state) => {
        const updated = [normalized, ...state.products];
        saveCatalog(updated);
        return { products: updated };
      });
    },

    updateProduct: (updatedProduct) => {
      const normalized = normalizeProductData(updatedProduct);
      set((state) => {
        const updated = state.products.map((p) => (p.id === normalized.id ? normalized : p));
        saveCatalog(updated);
        return { products: updated };
      });
    },

    deleteProduct: (id) => {
      set((state) => {
        const updated = state.products.filter((p) => p.id !== id);
        saveCatalog(updated);
        return { products: updated };
      });
    },

    restockVariant: (productId, variantId, addedQty, notes, options) => {
      set((state) => {
        let affectedProduct: Product | undefined;
        let affectedVariantName = '';
        let newStock = 0;

        const unitCostRp = options?.unitCostRp && options.unitCostRp > 0 ? Math.round(options.unitCostRp) : undefined;
        const totalCostRp = unitCostRp ? Math.round(unitCostRp * addedQty) : undefined;

        const updatedProducts = state.products.map((p) => {
          if (p.id !== productId) return p;
          const updatedVariants = p.variants.map((v) => {
            if (v.id !== variantId) return v;
            const cur = v.stock_qty ?? 0;
            newStock = cur + addedQty;
            const minAlert = v.min_stock_alert ?? 200;
            const newStatus: StockStatus =
              newStock <= 0 ? 'out_of_stock' : newStock <= minAlert ? 'limited' : 'ready';
            affectedVariantName = v.name;

            const updatedUnits =
              options?.updateUnitCogs && unitCostRp
                ? v.units.map((u) => ({
                    ...u,
                    cogs_price: Math.round(unitCostRp * (u.base_multiplier || 1))
                  }))
                : v.units;

            return { ...v, stock_qty: newStock, stock_status: newStatus, units: updatedUnits };
          });
          affectedProduct = { ...p, variants: updatedVariants };
          return affectedProduct;
        });

        const costInfo = unitCostRp
          ? ` | Beli @Rp ${unitCostRp.toLocaleString('id-ID')}/pcs${options?.updateUnitCogs ? ' (HPP diperbarui)' : ''}`
          : '';

        const newMovement: StockMovement = {
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          created_at: new Date().toISOString(),
          product_id: productId,
          product_name: affectedProduct?.name || 'Produk',
          variant_id: variantId,
          variant_name: affectedVariantName,
          type: 'in_restock',
          qty_change: addedQty,
          unit_cost_rp: unitCostRp,
          total_cost_rp: totalCostRp,
          resulting_stock: newStock,
          notes: `${notes || 'Restock / Stok Masuk dari Pabrik'}${costInfo}`
        };

        const updatedMovements = [newMovement, ...state.stockMovements].slice(0, 200);
        saveCatalog(updatedProducts);
        saveMovements(updatedMovements);
        return { products: updatedProducts, stockMovements: updatedMovements };
      });
    },

    deductStock: (items, orderNumber) => {
      set((state) => {
        const { updatedProducts, movementsToAdd } = adjustVariantStock(
          state.products,
          items,
          -1,
          'out_sale',
          orderNumber ? `Penjualan ${orderNumber}` : 'Penjualan Toko / Kasir',
          orderNumber
        );

        const updatedMovements = [...movementsToAdd, ...state.stockMovements].slice(0, 200);
        saveCatalog(updatedProducts);
        saveMovements(updatedMovements);
        return { products: updatedProducts, stockMovements: updatedMovements };
      });
    },

    restoreStock: (items, orderNumber, reason) => {
      set((state) => {
        const { updatedProducts, movementsToAdd } = adjustVariantStock(
          state.products,
          items,
          1,
          'in_void_return',
          orderNumber
            ? `Pengembalian Stok Nota Batal ${orderNumber}${reason ? ` (${reason})` : ''}`
            : 'Pengembalian Stok Pembatalan Nota',
          orderNumber
        );

        const updatedMovements = [...movementsToAdd, ...state.stockMovements].slice(0, 200);
        saveCatalog(updatedProducts);
        saveMovements(updatedMovements);
        return { products: updatedProducts, stockMovements: updatedMovements };
      });
    },

    resetDefaultCatalog: () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MOVEMENTS_STORAGE_KEY);
      const defaults = INITIAL_PRODUCTS.map((p) => normalizeProductData(p));
      initCatalogIndex(defaults);
      set({ products: defaults, stockMovements: [] });
    }
  };
});
