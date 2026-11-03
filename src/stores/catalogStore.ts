import { create } from 'zustand';
import { Product } from '../types';
import { INITIAL_PRODUCTS } from '../lib/constants';
import { initCatalogIndex } from '../lib/catalogDb';

interface CatalogState {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  resetDefaultCatalog: () => void;
}

const STORAGE_KEY = 'plastipro_custom_catalog_v2';

function loadInitialCatalog(): Product[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca custom catalog dari localStorage:', err);
  }
  return INITIAL_PRODUCTS;
}

function saveCatalog(products: Product[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    initCatalogIndex(products);
  } catch (err) {
    console.warn('Gagal menyimpan custom catalog ke localStorage:', err);
  }
}

export const useCatalogStore = create<CatalogState>((set) => {
  const initial = loadInitialCatalog();
  initCatalogIndex(initial);

  return {
    products: initial,

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

    resetDefaultCatalog: () => {
      localStorage.removeItem(STORAGE_KEY);
      initCatalogIndex(INITIAL_PRODUCTS);
      set({ products: INITIAL_PRODUCTS });
    }
  };
});
