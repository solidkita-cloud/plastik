import { create } from 'zustand'
import { generateIdempotencyKey, validateCartItem } from '../lib/security'

interface CartItem {
  variant_id: string
  unit_id: string
  qty: number
  sku: string
}

interface CartStore {
  items: CartItem[]
  idempotencyKey: string
  addItem: (item: CartItem) => void
  removeItem: (unit_id: string) => void
  clear: () => void
  regenerateKey: () => void
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  idempotencyKey: generateIdempotencyKey(),
  addItem: (item) => {
    validateCartItem(item)
    set((state) => {
      const existing = state.items.find(i => i.unit_id === item.unit_id)
      if (existing) {
        return { items: state.items.map(i => i.unit_id === item.unit_id ? { ...i, qty: i.qty + item.qty } : i) }
      }
      return { items: [...state.items, item] }
    })
  },
  removeItem: (unit_id) => set((state) => ({ items: state.items.filter(i => i.unit_id !== unit_id) })),
  clear: () => set({ items: [] }),
  regenerateKey: () => set({ idempotencyKey: generateIdempotencyKey() })
}))
