import { create } from 'zustand'
import seedStore from '../data/store.json'

export interface Shop {
  id: number
  name: string
  address: string
  ownerId: number
  logo?: string   // base64 data URL
  createdAt: string
}

interface ShopStore {
  shops: Shop[]
  addShop:    (shop: Omit<Shop, 'createdAt'>) => void
  updateShop: (id: number, data: { name: string; address: string; logo?: string }) => void
}

export const useShopStore = create<ShopStore>(set => ({
  shops: [seedStore],

  addShop: (shop) => set(state => ({
    shops: [...state.shops, { ...shop, createdAt: new Date().toISOString() }],
  })),

  updateShop: (id, data) => set(state => ({
    shops: state.shops.map(s => s.id === id ? { ...s, ...data } : s),
  })),
}))
