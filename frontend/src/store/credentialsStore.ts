import { create } from 'zustand'
import creds from '../data/credentials.json'

// Build userId → credential map from credentials.json.
// Owners/managers use `password`, staff use `pin`.
const seedPasswords: Record<number, string> = {}
for (const u of creds.users) {
  if ('password' in u && u.password) seedPasswords[u.id] = u.password
  else if ('pin' in u && u.pin)      seedPasswords[u.id] = u.pin
}

interface CredStore {
  passwords: Record<number, string>
  setPassword:    (userId: number, password: string) => void
  removePassword: (userId: number) => void
  verify:         (userId: number, password: string) => boolean
}

export const useCredStore = create<CredStore>((set, get) => ({
  passwords: seedPasswords,

  setPassword: (userId, password) => set(state => ({
    passwords: { ...state.passwords, [userId]: password },
  })),

  removePassword: (userId) => set(state => {
    const next = { ...state.passwords }
    delete next[userId]
    return { passwords: next }
  }),

  verify: (userId, password) => get().passwords[userId] === password,
}))
