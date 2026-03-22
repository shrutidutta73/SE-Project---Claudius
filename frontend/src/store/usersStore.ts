import { create } from 'zustand'
import type { User } from '../types'
import creds from '../data/credentials.json'

// Seed users from credentials.json so login credentials always match the user list.
const seedUsers: User[] = creds.users.map(u => ({
  id:        u.id,
  storeId:   1,
  name:      u.name,
  phone:     u.phone,
  email:     'email' in u ? (u.email ?? null) : null,
  role:      u.role as User['role'],
  isActive:  true,
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
}))

interface UsersStore {
  users: User[]
  addUser:      (data: { name: string; phone: string; email?: string; role: 'owner' | 'manager' | 'staff'; storeId?: number }) => void
  updateUser:   (id: number, data: { name: string; phone: string; email?: string }) => void
  updateAvatar: (id: number, avatar: string | null) => void
  deleteUser:   (id: number) => void
}

export const useUsersStore = create<UsersStore>((set) => ({
  users: seedUsers,

  addUser: (data) => set(state => ({
    users: [...state.users, {
      id:        Math.max(...state.users.map(u => u.id)) + 1,
      storeId:   data.storeId ?? 1,
      name:      data.name,
      phone:     data.phone,
      email:     data.email ?? null,
      role:      data.role,
      isActive:  true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }],
  })),

  updateUser: (id, data) => set(state => ({
    users: state.users.map(u =>
      u.id === id
        ? { ...u, name: data.name, phone: data.phone, email: data.email ?? u.email, updatedAt: new Date().toISOString() }
        : u
    ),
  })),

  updateAvatar: (id, avatar) => set(state => ({
    users: state.users.map(u => u.id === id ? { ...u, avatar } : u),
  })),

  deleteUser: (id) => set(state => ({
    users: state.users.filter(u => u.id !== id),
  })),
}))
