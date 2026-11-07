import { create } from 'zustand';
import { Product, StockMovement, StockStatus } from '../types';
import { INITIAL_PRODUCTS } from '../lib/constants';
import { initCatalogIndex } from '../lib/catalogDb';

interface CatalogState {
  products: Product[];
  stockMovements: StockMovement[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  restockVariant: (productId: string, variantId: string, addedQty: number, notes?: string) => void;
  deductStock: (items: { variant_id: string; qty: number; base_multiplier: number }[], orderNumber?: string) => void;
  resetDefaultCatalog: () => void;
}

const STORAGE_KEY = 'plastipro_custom_catalog_v2';
const MOVEMENTS_STORAGE_KEY = 'plastipro_stock_movements_v1';

function loadInitialCatalog(): Product[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: Product) => {
          const defaultMatch = INITIAL_PRODUCTS.find((init) => init.id === p.id);
          const imageUrl = (defaultMatch && (p.image_url?.startsWith('data:image/svg') || !p.image_url))
            ? defaultMatch.image_url
            : p.image_url;

          // Inisialisasi stok fisik realistis jika belum ada
          const updatedVariants = p.variants.map((v) => {
            const defaultQty = v.stock_qty ?? 1500;
            const minAlert = v.min_stock_alert ?? 200;
            const status: StockStatus = defaultQty <= 0 ? 'out_of_stock' : defaultQty <= minAlert ? 'limited' : 'ready';
            return {
              ...v,
              stock_qty: defaultQty,
              min_stock_alert: minAlert,
              stock_status: status
            };
          });

          return { ...p, image_url: imageUrl, variants: updatedVariants };
        });
      }
    }
  } catch (err) {
    console.warn('Gagal membaca custom catalog dari localStorage:', err);
  }

  // Fallback awal dengan stok realistis
  return INITIAL_PRODUCTS.map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({
      ...v,
      stock_qty: v.stock_qty ?? 1500,
      min_stock_alert: v.min_stock_alert ?? 200,
      stock_status: 'ready' as StockStatus
    }))
  }));
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

function saveCatalog(products: Product[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    initCatalogIndex(products);
  } catch (err) {
    console.warn('Gagal menyimpan custom catalog ke localStorage:', err);
  }
}

function saveMovements(movements: StockMovement[]) {
  try {
    localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(movements));
  } catch (err) {
    console.warn('Gagal menyimpan stock movements:', err);
  }
}

export const useCatalogStore = create<CatalogState>((set) => {
  const initial = loadInitialCatalog();
  const initialMovements = loadInitialMovements();
  initCatalogIndex(initial);

  return {
    products: initial,
    stockMovements: initialMovements,

    addProduct: (newProduct) => {
      set((state) => {
        const updated = [newProduct, ...state.products];
        saveCatalog(updated);
        return { products: updated };
      });
    },

    updateProduct: (updatedProduct) => {
      set((state) => {
        const updated = state.products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
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

    restockVariant: (productId, variantId, addedQty, notes) => {
      set((state) => {
        let affectedProduct: Product | undefined;
        let affectedVariantName = '';
        let newStock = 0;

        const updatedProducts = state.products.map((p) => {
          if (p.id !== productId) return p;
          const updatedVariants = p.variants.map((v) => {
            if (v.id !== variantId) return v;
            const cur = v.stock_qty ?? 0;
            newStock = cur + addedQty;
            const minAlert = v.min_stock_alert ?? 200;
            const newStatus: StockStatus = newStock <= 0 ? 'out_of_stock' : newStock <= minAlert ? 'limited' : 'ready';
            affectedVariantName = v.name;
            return { ...v, stock_qty: newStock, stock_status: newStatus };
          });
          affectedProduct = { ...p, variants: updatedVariants };
          return affectedProduct;
        });

        const newMovement: StockMovement = {
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          created_at: new Date().toISOString(),
          product_id: productId,
          product_name: affectedProduct?.name || 'Produk',
          variant_id: variantId,
          variant_name: affectedVariantName,
          type: 'in_restock',
          qty_change: addedQty,
          resulting_stock: newStock,
          notes: notes || 'Restock / Stok Masuk dari Pabrik'
        };

        const updatedMovements = [newMovement, ...state.stockMovements].slice(0, 100);
        saveCatalog(updatedProducts);
        saveMovements(updatedMovements);
        return { products: updatedProducts, stockMovements: updatedMovements };
      });
    },

    deductStock: (items, orderNumber) => {
      set((state) => {
        const movementsToAdd: StockMovement[] = [];
        const updatedProducts = state.products.map((p) => {
          let productModified = false;
          const updatedVariants = p.variants.map((v) => {
            const matchingItem = items.find((it) => it.variant_id === v.id);
            if (!matchingItem) return v;

            productModified = true;
            const baseQtyDeducted = matchingItem.qty * (matchingItem.base_multiplier || 1);
            const cur = v.stock_qty ?? 1000;
            const newStock = Math.max(0, cur - baseQtyDeducted);
            const minAlert = v.min_stock_alert ?? 200;
            const newStatus: StockStatus = newStock <= 0 ? 'out_of_stock' : newStock <= minAlert ? 'limited' : 'ready';

            movementsToAdd.push({
              id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              created_at: new Date().toISOString(),
              product_id: p.id,
              product_name: p.name,
              variant_id: v.id,
              variant_name: v.name,
              type: 'out_sale',
              qty_change: -baseQtyDeducted,
              resulting_stock: newStock,
              notes: orderNumber ? `Penjualan ${orderNumber}` : 'Penjualan Toko / Kasir',
              order_number: orderNumber
            });

            return { ...v, stock_qty: newStock, stock_status: newStatus };
          });

          return productModified ? { ...p, variants: updatedVariants } : p;
        });

        const updatedMovements = [...movementsToAdd, ...state.stockMovements].slice(0, 100);
        saveCatalog(updatedProducts);
        saveMovements(updatedMovements);
        return { products: updatedProducts, stockMovements: updatedMovements };
      });
    },

    resetDefaultCatalog: () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MOVEMENTS_STORAGE_KEY);
      const defaults = INITIAL_PRODUCTS.map((p) => ({
        ...p,
        variants: p.variants.map((v) => ({
          ...v,
          stock_qty: 1500,
          min_stock_alert: 200,
          stock_status: 'ready' as StockStatus
        }))
      }));
      initCatalogIndex(defaults);
      set({ products: defaults, stockMovements: [] });
    }
  };
});
