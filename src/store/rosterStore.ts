import { create } from 'zustand'
import { MOCK_LEADERBOARD } from '../lib/mock'

export interface RosterEntry {
  userId:     number
  name:       string
  clockedIn:  boolean
  clockInAt:  string | null   // ISO string
  clockOutAt: string | null
}

interface RosterStore {
  entries:       Record<number, RosterEntry>
  forceClockOut: (userId: number) => void
}

// Seed from mock leaderboard (staff only)
const initial: Record<number, RosterEntry> = {}
for (const e of MOCK_LEADERBOARD) {
  if (e.role === 'staff') {
    initial[e.userId] = {
      userId:     e.userId,
      name:       e.name,
      clockedIn:  e.clockedIn,
      clockInAt:  e.checkInAt,
      clockOutAt: null,
    }
  }
}

export const useRosterStore = create<RosterStore>(set => ({
  entries: initial,

  forceClockOut: (userId) => set(state => ({
    entries: {
      ...state.entries,
      [userId]: {
        ...state.entries[userId],
        clockedIn:  false,
        clockOutAt: new Date().toISOString(),
      },
    },
  })),
}))
