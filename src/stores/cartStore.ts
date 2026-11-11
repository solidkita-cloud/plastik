import { create } from 'zustand';
import { CartItem, CustomerProfile } from '../types';
import { generateIdempotencyKey, validateCartItem } from '../lib/security';
import { useCatalogStore, resolveUnitCogsPrice } from './catalogStore';

interface CartState {
  items: CartItem[];
  customer: CustomerProfile | null;
  deliveryMethod: 'pickup' | 'instant' | 'kargo';
  customerNote: string;
  idempotencyKey: string;
  isCartOpen: boolean;

  // Actions
  addItem: (item: CartItem) => void;
  updateQty: (unit_id: string, qty: number) => void;
  removeItem: (unit_id: string) => void;
  clearCart: () => void;
  setCustomer: (customer: CustomerProfile | null) => void;
  setDeliveryMethod: (method: 'pickup' | 'instant' | 'kargo') => void;
  setCustomerNote: (note: string) => void;
  setIsCartOpen: (open: boolean) => void;
  regenerateIdempotencyKey: () => void;

  // Computations
  getTotalQty: () => number;
  getSubtotal: () => number;
  getTotalWeightKg: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [
    // Pre-seed with the 2 items shown in the mockup image for initial demonstration
    {
      product_id: 'prod_cup_16',
      product_name: 'Cup Plastik 16 oz (Transparan)',
      variant_id: 'var_cup16_std',
      variant_name: '16 oz (500 ml) - Datar',
      unit_id: 'u_cup16_pak',
      unit_name: 'Pack (Isi 50 pcs)',
      unit_code: 'PAK',
      base_multiplier: 50,
      sku: 'CUP-16-PP-FLAT',
      price: 65000,
      qty: 2,
      weight_grams: 800
    }
  ],
  customer: null,
  deliveryMethod: 'instant',
  customerNote: '',
  idempotencyKey: generateIdempotencyKey(),
  isCartOpen: false,

  addItem: (newItem) => {
    validateCartItem({
      variant_id: newItem.variant_id,
      unit_id: newItem.unit_id,
      qty: newItem.qty
    });

    const products = useCatalogStore.getState().products;
    const resolvedCogs = resolveUnitCogsPrice(
      products,
      newItem.variant_id,
      newItem.unit_id,
      newItem.price,
      newItem.cogs_price
    );

    const itemWithCogs: CartItem = {
      ...newItem,
      cogs_price: resolvedCogs
    };

    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.unit_id === itemWithCogs.unit_id);
      if (existingIndex > -1) {
        const updated = [...state.items];
        updated[existingIndex].qty += itemWithCogs.qty;
        return { items: updated };
      }
      return { items: [...state.items, itemWithCogs] };
    });
  },

  updateQty: (unit_id, qty) => {
    if (qty <= 0) {
      get().removeItem(unit_id);
      return;
    }
    set((state) => ({
      items: state.items.map((i) => (i.unit_id === unit_id ? { ...i, qty } : i))
    }));
  },

  removeItem: (unit_id) => {
    set((state) => ({
      items: state.items.filter((i) => i.unit_id !== unit_id)
    }));
  },

  clearCart: () => {
    set({
      items: [],
      idempotencyKey: generateIdempotencyKey()
    });
  },

  setCustomer: (customer) => set({ customer }),
  setDeliveryMethod: (deliveryMethod) => set({ deliveryMethod }),
  setCustomerNote: (customerNote) => set({ customerNote }),
  setIsCartOpen: (isCartOpen) => set({ isCartOpen }),
  regenerateIdempotencyKey: () => set({ idempotencyKey: generateIdempotencyKey() }),

  getTotalQty: () => {
    return get().items.reduce((total, item) => total + item.qty, 0);
  },

  getSubtotal: () => {
    return get().items.reduce((total, item) => total + item.price * item.qty, 0);
  },

  getTotalWeightKg: () => {
    const totalGrams = get().items.reduce((total, item) => total + item.weight_grams * item.qty, 0);
    return Math.max(0.1, Number((totalGrams / 1000).toFixed(2)));
  }
}));
