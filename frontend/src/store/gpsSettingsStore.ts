import { create } from 'zustand'

export interface GpsPolicy {
  requireOnClockIn:  boolean
  requireOnClockOut: boolean
}

interface GpsSettingsStore {
  // Global toggles — apply to ALL staff unless overridden
  globalClockIn:  boolean
  globalClockOut: boolean
  setGlobal: (patch: { clockIn?: boolean; clockOut?: boolean }) => void

  // Per-staff overrides (optional, future use)
  policies:  Record<number, GpsPolicy>
  setPolicy: (userId: number, patch: Partial<GpsPolicy>) => void
  getPolicy: (userId: number) => GpsPolicy
}

export const useGpsSettingsStore = create<GpsSettingsStore>((set, get) => ({
  globalClockIn:  false,
  globalClockOut: false,

  setGlobal: ({ clockIn, clockOut }) => set(state => ({
    globalClockIn:  clockIn  !== undefined ? clockIn  : state.globalClockIn,
    globalClockOut: clockOut !== undefined ? clockOut : state.globalClockOut,
  })),

  policies: {},

  setPolicy: (userId, patch) => set(state => ({
    policies: {
      ...state.policies,
      [userId]: {
        ...(state.policies[userId] ?? { requireOnClockIn: state.globalClockIn, requireOnClockOut: state.globalClockOut }),
        ...patch,
      },
    },
  })),

  getPolicy: (userId) => {
    const { globalClockIn, globalClockOut, policies } = get()
    const override = policies[userId]
    return {
      requireOnClockIn:  override?.requireOnClockIn  ?? globalClockIn,
      requireOnClockOut: override?.requireOnClockOut ?? globalClockOut,
    }
  },
}))
