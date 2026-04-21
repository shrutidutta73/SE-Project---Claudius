import { create } from 'zustand'
import { api } from '../lib/api'
import type { CartItem, PaymentMethod } from '../types'

export interface CheckoutResult {
  ok: boolean
  error?: string
}

interface CartStore {
  items: CartItem[]
  privacyMode: boolean
  customerName: string
  customerPhone: string

  addItem: (item: Omit<CartItem, 'quantity' | 'subtotal'>) => void
  updateQty: (priceBandId: number, delta: number) => void
  removeItem: (priceBandId: number) => void
  setCustomer: (name: string, phone: string) => void
  togglePrivacyMode: () => void
  clear: () => void
  checkout: (method: PaymentMethod) => Promise<CheckoutResult>

  total: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  privacyMode: false,
  customerName: '',
  customerPhone: '',

  addItem: (incoming) => {
    set(state => {
      const existing = state.items.find(i => i.priceBandId === incoming.priceBandId)
      if (existing) {
        return {
          items: state.items.map(i =>
            i.priceBandId === incoming.priceBandId
              ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
              : i
          ),
        }
      }
      return {
        items: [...state.items, { ...incoming, quantity: 1, subtotal: incoming.price }],
      }
    })
  },

  updateQty: (priceBandId, delta) => {
    set(state => {
      const items = state.items
        .map(i =>
          i.priceBandId === priceBandId
            ? { ...i, quantity: i.quantity + delta, subtotal: (i.quantity + delta) * i.price }
            : i
        )
        .filter(i => i.quantity > 0)
      return { items }
    })
  },

  removeItem: (priceBandId) => {
    set(state => ({ items: state.items.filter(i => i.priceBandId !== priceBandId) }))
  },

  setCustomer: (name, phone) => set({ customerName: name, customerPhone: phone }),

  togglePrivacyMode: () => set(state => ({ privacyMode: !state.privacyMode })),

  clear: () => set({ items: [], customerName: '', customerPhone: '' }),

  checkout: async (method: PaymentMethod) => {
    const { items, customerName, customerPhone, clear } = get()
    if (items.length === 0) return { ok: false, error: 'Cart is empty.' }
    try {
      await api.post('/sales', {
        items: items.map(i => ({
          priceBandId: i.priceBandId,
          categoryName: i.categoryName,
          price: i.price,
          quantity: i.quantity,
          subtotal: i.subtotal,
        })),
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        paymentMethod: method,
        discountAmount: 0,
      })
      clear()
      return { ok: true }
    } catch (err) {
      // Leave the cart untouched so the user can retry without re-adding items.
      const message = err instanceof Error ? err.message : 'Checkout failed'
      return { ok: false, error: message }
    }
  },

  total: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
}))
