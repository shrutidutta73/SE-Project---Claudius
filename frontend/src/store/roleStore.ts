import { create } from 'zustand'
import type { User } from '../types'
import { setToken, clearToken, cacheUser } from '../lib/api'

export type Role = 'owner' | 'staff' | 'manager'

interface AuthStore {
  currentUser:  User | null
  clockedIn:    boolean
  clockInTime:  Date | null
  login:        (user: User, token?: string) => void
  logout:       () => void
  setClockedIn: (val: boolean) => void
}

export const useAuthStore = create<AuthStore>(set => ({
  currentUser: null,
  clockedIn:   false,
  clockInTime: null,
  login: (user, token) => {
    if (token) setToken(token)
    cacheUser(user)
    set({ currentUser: user, clockedIn: false, clockInTime: null })
  },
  logout: () => {
    clearToken()
    set({ currentUser: null, clockedIn: false, clockInTime: null })
  },
  setClockedIn: val => set({ clockedIn: val, clockInTime: val ? new Date() : null }),
}))

// Pages accessible per role — ordered for nav/tabs
export const ROLE_ROUTES: Record<Role, string[]> = {
  owner:   ['/dashboard', '/staff', '/settings'],
  staff:   ['/staff', '/pos'],
  manager: ['/dashboard', '/inventory', '/staff', '/procurement'],
}

// Landing page after login
export const ROLE_DEFAULT: Record<Role, string> = {
  owner:   '/dashboard',
  staff:   '/staff',
  manager: '/dashboard',
}
