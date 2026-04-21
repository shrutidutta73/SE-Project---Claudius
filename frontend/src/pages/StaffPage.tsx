import { useState, useEffect } from 'react'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import ClockWidget from '../components/staff/ClockWidget'
import { getInitials, formatCurrencyFull } from '../lib/utils'
import { useAuthStore, type Role } from '../store/roleStore'
import { useGpsSettingsStore } from '../store/gpsSettingsStore'
import AvatarUpload from '../components/ui/AvatarUpload'
import { api } from '../lib/api'
import type { User, Store, StaffLeaderboardEntry } from '../types'

// ── Icons ─────────────────────────────────────────────────
const IcEdit   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IcDelete = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
const IcPlus   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>

// ── Shared user form ──────────────────────────────────────
interface UserFormProps {
  initial?: { name: string; phone: string; email?: string }
  withEmail?: boolean
  withPassword?: boolean
  withPin?: boolean
  apiError?: string | null
  submitting?: boolean
  onSubmit: (name: string, phone: string, email?: string, password?: string, pin?: string) => void
  onCancel: () => void
  submitLabel: string
}
function UserForm({ initial, withEmail, withPassword, withPin, apiError, submitting, onSubmit, onCancel, submitLabel }: UserFormProps) {
  const [name,     setName]     = useState(initial?.name  ?? '')
  const [phone,    setPhone]    = useState(initial?.phone ?? '')
  const [email,    setEmail]    = useState(initial?.email ?? '')
  const [password, setPassword] = useState('')
  const [pin,      setPin]      = useState('')
  const [showPass, setShowPass] = useState(false)
  const [err,      setErr]      = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim())            { setErr('Name is required.'); return }
    if (!/^\d{10}$/.test(phone)) { setErr('Enter a valid 10-digit phone number.'); return }
    if (withEmail && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('Enter a valid email address.'); return }
    if (withPassword && password.length < 6) { setErr('Password must be at least 6 characters.'); return }
    if (withPin && !initial && !/^\d{4}$/.test(pin)) { setErr('PIN is required and must be exactly 4 digits.'); return }
    if (withPin && initial && pin && !/^\d{4}$/.test(pin)) { setErr('PIN must be exactly 4 digits.'); return }
    onSubmit(name.trim(), phone.trim(), withEmail ? email.trim() || undefined : undefined, withPassword ? password : undefined, withPin ? pin || undefined : undefined)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Full Name"    placeholder="e.g. Suresh Patel"        value={name}  onChange={e => { setName(e.target.value);  setErr('') }} />
      <Input label="Phone Number" placeholder="10-digit mobile"          value={phone} onChange={e => { setPhone(e.target.value); setErr('') }} type="tel" />
      {withEmail && (
        <Input label="Email Address" placeholder="e.g. vikram@example.com" value={email} onChange={e => { setEmail(e.target.value); setErr('') }} type="email" />
      )}
      {withPassword && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Password</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showPass ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => { setPassword(e.target.value); setErr('') }}
            />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }} tabIndex={-1}>
              {showPass
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
        </div>
      )}
      {withPin && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
              Staff Login PIN
            </label>
            <span className="text-xs" style={{ color: initial ? 'var(--text-4)' : 'var(--danger)' }}>
              {initial ? 'Leave blank to keep current' : 'Required'}
            </span>
          </div>
          {/* 4-dot display */}
          <div className="flex gap-3 justify-center py-1">
            {[0,1,2,3].map(i => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < pin.length ? 'var(--primary)' : 'var(--border)', transition: 'background 0.12s' }} />
            ))}
          </div>
          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2" style={{ maxWidth: 220, margin: '0 auto', width: '100%' }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => {
              if (!k) return <div key={i} />
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setErr('')
                    if (k === '⌫') { setPin(p => p.slice(0, -1)); return }
                    if (pin.length < 4) setPin(p => p + k)
                  }}
                  style={{
                    height: 48, borderRadius: 10,
                    fontSize: k === '⌫' ? 16 : 18,
                    fontWeight: 600,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: k === '⌫' ? 'var(--text-3)' : 'var(--text-1)',
                    touchAction: 'manipulation',
                  }}
                >
                  {k}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {err && <p className="text-xs" style={{ color: 'var(--danger)' }}>{err}</p>}
      {apiError && !err && (
        <p className="text-xs rounded-md px-3 py-2" style={{ color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
          {apiError}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" className="btn btn-ghost flex-1" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit"  className="btn btn-primary flex-1" disabled={submitting}>{submitting ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  )
}

// ── User list card ────────────────────────────────────────
interface UserCardProps {
  user: User
  isCurrentUser: boolean
  onEdit:        (user: User) => void
  onDelete:      (user: User) => void
  onAvatarSave?: (dataUrl: string) => void
}
function UserCard({ user, isCurrentUser, onEdit, onDelete, onAvatarSave }: UserCardProps) {
  return (
    <div className="card p-4 flex items-center gap-3">
      {onAvatarSave ? (
        <AvatarUpload name={user.name} avatar={user.avatar} size={40} onSave={onAvatarSave} />
      ) : (
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: 'var(--primary)' }}>
          {getInitials(user.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{user.name}</p>
          {isCurrentUser && <Badge color="primary">You</Badge>}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{user.phone}</p>
        {user.email && <p className="text-xs" style={{ color: 'var(--text-4)' }}>{user.email}</p>}
      </div>
      {!isCurrentUser && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(user)}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}
          >
            <IcEdit />
          </button>
          <button
            onClick={() => onDelete(user)}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--danger)', border: '1px solid var(--border)' }}
          >
            <IcDelete />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Toggle row (global setting) ───────────────────────────
function ToggleRow({ label, description, active, onChange }: { label: string; description: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!active)}
        style={{
          width: 44, height: 24, borderRadius: 12, flexShrink: 0,
          background: active ? 'var(--primary)' : 'var(--border)',
          position: 'relative', border: 'none', cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: active ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

// ── Shift duration hook ───────────────────────────────────
function useShiftDuration(clockInTime: Date | null) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!clockInTime) { setElapsed(0); return }
    const tick = () => setElapsed(Math.floor((Date.now() - clockInTime.getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [clockInTime])
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  return h > 0
    ? `${h}h ${String(m).padStart(2, '0')}m`
    : `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

// ── Staff personal dashboard ──────────────────────────────
interface StaffDashboardProps {
  store: Store | null
}
function StaffDashboard({ store }: StaffDashboardProps) {
  const currentUser  = useAuthStore(s => s.currentUser)!
  const clockedIn    = useAuthStore(s => s.clockedIn)
  const clockInTime  = useAuthStore(s => s.clockInTime)
  const setClockedIn = useAuthStore(s => s.setClockedIn)
  const shiftLabel   = useShiftDuration(clockInTime)

  const getPolicy    = useGpsSettingsStore(s => s.getPolicy)
  const gpsPolicy    = getPolicy(currentUser.id)

  const [revenueToday, setRevenueToday] = useState(0)
  const [salesCount,   setSalesCount]   = useState(0)

  useEffect(() => {
    api.get<StaffLeaderboardEntry[]>('/staff/leaderboard')
      .then(entries => {
        const entry = entries.find(e => e.userId === currentUser.id)
        if (entry) {
          setRevenueToday(entry.revenueToday)
          setSalesCount(entry.salesCountToday)
        }
      })
      .catch(() => {/* ignore */})
  }, [currentUser.id])

  // Fallback store used only if parent hasn't loaded yet
  const effectiveStore: Store = store ?? {
    id: 0,
    name: '',
    address: '',
    gpsLatitude: 0,
    gpsLongitude: 0,
    gpsRadiusM: 500,
    gpsRequireClockIn: false,
    gpsRequireClockOut: false,
    billingMode: 'structured',
    retentionDays: null,
    createdAt: '',
    updatedAt: '',
  }

  async function handleClock(action: 'in' | 'out') {
    if (!navigator.geolocation) {
      // No geolocation — call with zeros
      try {
        if (action === 'in') {
          await api.post('/attendance/clock-in', { lat: 0, lng: 0 })
        } else {
          await api.post('/attendance/clock-out', { lat: 0, lng: 0 })
        }
      } catch {/* ignore */}
      setClockedIn(action === 'in')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          if (action === 'in') {
            await api.post('/attendance/clock-in', { lat, lng })
          } else {
            await api.post('/attendance/clock-out', { lat, lng })
          }
        } catch {/* ignore */}
        setClockedIn(action === 'in')
      },
      async () => {
        // Position error — fall back to zeros
        try {
          if (action === 'in') {
            await api.post('/attendance/clock-in', { lat: 0, lng: 0 })
          } else {
            await api.post('/attendance/clock-out', { lat: 0, lng: 0 })
          }
        } catch {/* ignore */}
        setClockedIn(action === 'in')
      },
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* Clock widget */}
        <ClockWidget
          user={currentUser}
          store={effectiveStore}
          clockedIn={clockedIn}
          gpsPolicy={gpsPolicy}
          onClock={handleClock}
        />

        {/* Active shift panel */}
        {clockedIn && (
          <div className="flex flex-col gap-3 animate-slide-up">

            {/* Shift timer */}
            <div className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 0 3px rgba(5,150,105,0.2)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Shift in progress</p>
              </div>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--dark)', fontVariantNumeric: 'tabular-nums' }}>
                {shiftLabel}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-4)' }}>Sales</p>
                <p className="text-4xl font-black tracking-tight leading-none" style={{ color: 'var(--dark)' }}>{salesCount}</p>
                <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-3)' }}>transactions</p>
              </div>
              <div className="card p-4">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-4)' }}>Revenue</p>
                <p className="text-2xl font-black tracking-tight leading-none" style={{ color: 'var(--primary)' }}>{formatCurrencyFull(revenueToday)}</p>
                <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-3)' }}>billed today</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

// ── Roster entry shape from leaderboard ──────────────────
interface RosterEntry {
  userId:       number
  name:         string
  clockedIn:    boolean
  clockInAt:    string | null
  clockOutAt:   string | null
  revenueToday: number
}

// ── Main page ─────────────────────────────────────────────
export default function StaffPage() {
  const currentUser  = useAuthStore(s => s.currentUser)
  const role         = (currentUser?.role ?? 'staff') as Role

  const [users,   setUsers]   = useState<User[]>([])
  const [store,   setStore]   = useState<Store | null>(null)
  const [rosterEntries, setRosterEntries] = useState<Record<number, RosterEntry>>({})

  const { globalClockIn, globalClockOut, setGlobal } = useGpsSettingsStore()
  const [tab, setTab] = useState<'staff' | 'roster'>('staff')

  // Fallback store used only if /store hasn't loaded yet
  const effectiveStore: Store = store ?? {
    id: 0,
    name: '',
    address: '',
    gpsLatitude: 0,
    gpsLongitude: 0,
    gpsRadiusM: 500,
    gpsRequireClockIn: false,
    gpsRequireClockOut: false,
    billingMode: 'structured',
    retentionDays: null,
    createdAt: '',
    updatedAt: '',
  }
  const [showAdd,      setShowAdd]      = useState(false)
  const [editTarget,   setEditTarget]   = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  // Inline API error + submitting state for the Add / Edit modals
  const [formError,     setFormError]     = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  function openAddModal() {
    setFormError(null)
    setShowAdd(true)
  }
  function closeAddModal() {
    setShowAdd(false)
    setFormError(null)
    setFormSubmitting(false)
  }
  function openEditModal(u: User) {
    setFormError(null)
    setEditTarget(u)
  }
  function closeEditModal() {
    setEditTarget(null)
    setFormError(null)
    setFormSubmitting(false)
  }

  function friendlyError(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err)
    if (!raw) return 'Could not save. Please try again.'
    if (/duplicate/i.test(raw))   return 'That phone number is already in use.'
    if (/validation/i.test(raw))  return 'Invalid input — check name, phone, and PIN/password.'
    if (/token|unauth/i.test(raw)) return 'Your session expired. Log in again.'
    if (/forbidden|permission/i.test(raw)) return "You don't have permission to do that."
    return raw
  }

  // Fetch users and store on mount; seed GPS toggles from store
  useEffect(() => {
    api.get<User[]>('/users').then(setUsers).catch(() => {})
    api.get<Store>('/store').then(s => {
      setStore(s)
      setGlobal({ clockIn: s.gpsRequireClockIn ?? false, clockOut: s.gpsRequireClockOut ?? false })
    }).catch(() => {})
  }, []) // eslint-disable-line

  // Fetch leaderboard to build roster entries (for manager view)
  useEffect(() => {
    if (role !== 'manager') return
    api.get<StaffLeaderboardEntry[]>('/staff/leaderboard')
      .then(entries => {
        const map: Record<number, RosterEntry> = {}
        for (const e of entries) {
          if (e.role === 'staff') {
            map[e.userId] = {
              userId:       e.userId,
              name:         e.name,
              clockedIn:    e.clockedIn,
              clockInAt:    e.checkInAt,
              clockOutAt:   null,
              revenueToday: e.revenueToday,
            }
          }
        }
        setRosterEntries(map)
      })
      .catch(() => {})
  }, [role])

  async function handleForceClockOut(userId: number) {
    try {
      await api.patch(`/attendance/force-clockout/${userId}`, {})
      setRosterEntries(prev => {
        const existing = prev[userId]
        if (!existing) return prev
        return {
          ...prev,
          [userId]: {
            ...existing,
            clockedIn:  false,
            clockOutAt: new Date().toISOString(),
          },
        }
      })
    } catch {/* ignore */}
  }

  async function handleAddManager(name: string, phone: string, email?: string, password?: string) {
    setFormError(null)
    setFormSubmitting(true)
    try {
      const newUser = await api.post<User>('/users', { name, phone, email, role: 'manager', password })
      setUsers(prev => [...prev, newUser])
      closeAddModal()
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleAddStaff(name: string, phone: string, _email?: string, _password?: string, pin?: string) {
    setFormError(null)
    setFormSubmitting(true)
    try {
      const newUser = await api.post<User>('/users', { name, phone, role: 'staff', pin })
      setUsers(prev => [...prev, newUser])
      closeAddModal()
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleUpdateUser(id: number, patch: { name: string; phone: string; email?: string }) {
    setFormError(null)
    setFormSubmitting(true)
    try {
      const updated = await api.patch<User>(`/users/${id}`, patch)
      setUsers(prev => prev.map(u => u.id === id ? updated : u))
      closeEditModal()
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleUpdateStaff(id: number, name: string, phone: string, pin?: string) {
    setFormError(null)
    setFormSubmitting(true)
    try {
      const updated = await api.patch<User>(`/users/${id}`, { name, phone })
      setUsers(prev => prev.map(u => u.id === id ? updated : u))
      if (pin) {
        await api.patch(`/users/${id}/pin`, { pin })
      }
      closeEditModal()
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDeleteUser(id: number) {
    try {
      await api.del(`/users/${id}`)
      setUsers(prev => prev.filter(u => u.id !== id))
      setDeleteTarget(null)
    } catch {/* ignore */}
  }

  async function handleAvatarSave(userId: number, dataUrl: string) {
    try {
      const updated = await api.patch<User>(`/users/${userId}/avatar`, { avatar: dataUrl })
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
    } catch {/* ignore */}
  }

  // ── STAFF VIEW ───────────────────────────────────────────
  if (role === 'staff') {
    return <StaffDashboard store={store} />
  }

  // ── OWNER VIEW: manage managers ──────────────────────────
  if (role === 'owner') {
    const managers = users.filter(u => u.role === 'manager')

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Managers</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>{managers.length} manager{managers.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-1.5 text-sm">
            <IcPlus /> Add Manager
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {managers.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-4)' }}>No managers yet. Add one to get started.</p>
            </div>
          ) : (
            managers.map(u => (
              <UserCard
                key={u.id}
                user={u}
                isCurrentUser={u.id === currentUser?.id}
                onEdit={openEditModal}
                onDelete={setDeleteTarget}
                onAvatarSave={dataUrl => handleAvatarSave(u.id, dataUrl)}
              />
            ))
          )}
        </div>

        {/* Add manager modal */}
        <Modal open={showAdd} onClose={closeAddModal} title="Add Manager">
          <UserForm
            withEmail
            withPassword
            apiError={formError}
            submitting={formSubmitting}
            onSubmit={handleAddManager}
            onCancel={closeAddModal}
            submitLabel="Add Manager"
          />
        </Modal>

        {/* Edit modal */}
        <Modal open={!!editTarget} onClose={closeEditModal} title="Edit Manager">
          {editTarget && (
            <UserForm
              withEmail
              initial={{ name: editTarget.name, phone: editTarget.phone, email: editTarget.email ?? '' }}
              apiError={formError}
              submitting={formSubmitting}
              onSubmit={(name, phone, email) => handleUpdateUser(editTarget.id, { name, phone, email })}
              onCancel={closeEditModal}
              submitLabel="Save Changes"
            />
          )}
        </Modal>

        {/* Delete confirmation */}
        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Manager">
          {deleteTarget && (
            <div className="flex flex-col gap-4">
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                Remove <strong>{deleteTarget.name}</strong> as manager? They will lose access to the system.
              </p>
              <div className="flex gap-2">
                <button className="btn btn-ghost flex-1" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button
                  className="btn flex-1 text-white"
                  style={{ background: 'var(--danger)' }}
                  onClick={() => handleDeleteUser(deleteTarget.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    )
  }

  // ── MANAGER VIEW: manage staff ───────────────────────────
  const staff        = users.filter(u => u.role === 'staff')
  const onShift      = Object.values(rosterEntries).filter(e => e.clockedIn).length
  const totalRevenue = Object.values(rosterEntries).reduce((s, e) => s + e.revenueToday, 0)

  // Anomaly: still clocked in from > 9 hours ago
  function getAnomalyHours(entry: RosterEntry) {
    if (!entry.clockedIn || !entry.clockInAt) return null
    const hours = (Date.now() - new Date(entry.clockInAt).getTime()) / 36e5
    return hours > 9 ? hours : null
  }

  const anomalyCount = Object.values(rosterEntries).filter(e => getAnomalyHours(e) !== null).length

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Staff</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>{onShift} on shift · {staff.length} total</p>
        </div>
        {tab === 'staff' && (
          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-1.5 text-sm">
            <IcPlus /> Add Staff
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--border)', width: 'fit-content' }}>
        {(['staff', 'roster'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all"
            style={tab === t
              ? { background: 'var(--surface)', color: 'var(--text-1)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: 'var(--text-3)', background: 'transparent' }
            }
          >
            {t}
            {t === 'roster' && anomalyCount > 0 && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--danger)',
              }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Staff tab ── */}
      {tab === 'staff' && (
        <>
          {/* Global GPS toggles */}
          <div className="card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)' }}>
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
              </svg>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>GPS Verification</p>
              <p className="text-xs ml-auto" style={{ color: 'var(--text-4)' }}>Applies to all staff</p>
            </div>
            <ToggleRow
              label="Require GPS on Clock In"
              description="Staff must be within store radius to clock in"
              active={globalClockIn}
              onChange={v => {
                setGlobal({ clockIn: v })
                const s = store ?? effectiveStore
                api.patch('/store/gps-settings', {
                  gpsLatitude: s.gpsLatitude, gpsLongitude: s.gpsLongitude, gpsRadiusM: s.gpsRadiusM,
                  gpsRequireClockIn: v, gpsRequireClockOut: globalClockOut,
                }).catch(() => {})
              }}
            />
            <div style={{ height: 1, background: 'var(--border)' }} />
            <ToggleRow
              label="Require GPS on Clock Out"
              description="Staff must be within store radius to clock out"
              active={globalClockOut}
              onChange={v => {
                setGlobal({ clockOut: v })
                const s = store ?? effectiveStore
                api.patch('/store/gps-settings', {
                  gpsLatitude: s.gpsLatitude, gpsLongitude: s.gpsLongitude, gpsRadiusM: s.gpsRadiusM,
                  gpsRequireClockIn: globalClockIn, gpsRequireClockOut: v,
                }).catch(() => {})
              }}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-4)' }}>On Shift</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{onShift} / {staff.length}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>clocked in</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-4)' }}>Revenue Today</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{formatCurrencyFull(totalRevenue)}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>across all staff</p>
            </div>
          </div>

          {/* Staff list with GPS toggles */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-4)' }}>All Staff</p>
            <div className="flex flex-col gap-2">
              {staff.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-4)' }}>No staff yet. Add someone to get started.</p>
                </div>
              ) : (
                staff.map(u => {
                  return (
                    <div key={u.id} className="card p-4 flex items-center gap-3">
                      <AvatarUpload name={u.name} avatar={u.avatar} size={40} onSave={dataUrl => handleAvatarSave(u.id, dataUrl)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{u.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{u.phone}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEditModal(u)} className="w-8 h-8 flex items-center justify-center rounded-md" style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}><IcEdit /></button>
                        <button onClick={() => setDeleteTarget(u)} className="w-8 h-8 flex items-center justify-center rounded-md" style={{ color: 'var(--danger)', border: '1px solid var(--border)' }}><IcDelete /></button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Roster tab ── */}
      {tab === 'roster' && (
        <div className="flex flex-col gap-3">
          {anomalyCount > 0 && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: 'var(--danger-bg)', border: '1px solid #FECDD3' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                {anomalyCount} anomal{anomalyCount === 1 ? 'y' : 'ies'} detected — staff still clocked in after 9+ hours
              </p>
            </div>
          )}

          {staff.map(u => {
            const entry = rosterEntries[u.id]
            const anomalyH = entry ? getAnomalyHours(entry) : null
            const isIn = entry?.clockedIn ?? false
            const clockInAt = entry?.clockInAt ? new Date(entry.clockInAt) : null
            const clockOutAt = entry?.clockOutAt ? new Date(entry.clockOutAt) : null
            const shiftMins = clockInAt && isIn
              ? Math.floor((Date.now() - clockInAt.getTime()) / 60000)
              : clockInAt && clockOutAt
              ? Math.floor((clockOutAt.getTime() - clockInAt.getTime()) / 60000)
              : null
            const shiftStr = shiftMins !== null
              ? shiftMins >= 60
                ? `${Math.floor(shiftMins / 60)}h ${shiftMins % 60}m`
                : `${shiftMins}m`
              : null

            return (
              <div key={u.id} className="card p-4 flex flex-col gap-3" style={anomalyH ? { borderColor: '#FECDD3', borderWidth: 1.5 } : {}}>
                <div className="flex items-start gap-3">
                  {/* Status dot + avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: isIn ? 'var(--primary)' : 'var(--border)' }}>
                      <span style={{ color: isIn ? '#fff' : 'var(--text-3)' }}>{getInitials(u.name)}</span>
                    </div>
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 10, height: 10, borderRadius: '50%',
                      background: isIn ? 'var(--success)' : 'var(--border-strong)',
                      border: '2px solid var(--surface)',
                    }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{u.name}</p>
                      {anomalyH && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                          {Math.floor(anomalyH)}h+ shift
                        </span>
                      )}
                    </div>

                    {isIn && clockInAt && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        Clocked in at {clockInAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        {shiftStr && <span style={{ color: 'var(--text-4)' }}> · {shiftStr}</span>}
                      </p>
                    )}
                    {!isIn && clockOutAt && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        Clocked out {clockOutAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        {shiftStr && <span style={{ color: 'var(--text-4)' }}> · {shiftStr} shift</span>}
                      </p>
                    )}
                    {!isIn && !clockOutAt && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>Not clocked in today</p>
                    )}
                  </div>

                  {isIn && (
                    <button
                      onClick={() => handleForceClockOut(u.id)}
                      className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ color: 'var(--danger)', border: '1px solid #FECDD3', background: 'var(--danger-bg)' }}
                    >
                      Force Out
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {staff.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-4)' }}>No staff yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Add staff modal */}
      <Modal open={showAdd} onClose={closeAddModal} title="Add Staff Member">
        <UserForm
          withPin
          apiError={formError}
          submitting={formSubmitting}
          onSubmit={handleAddStaff}
          onCancel={closeAddModal}
          submitLabel="Add Staff"
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={closeEditModal} title="Edit Staff Member">
        {editTarget && (
          <UserForm
            withPin
            initial={{ name: editTarget.name, phone: editTarget.phone }}
            apiError={formError}
            submitting={formSubmitting}
            onSubmit={(name, phone, _email, _password, pin) => handleUpdateStaff(editTarget.id, name, phone, pin)}
            onCancel={closeEditModal}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Staff Member">
        {deleteTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>
              Remove <strong>{deleteTarget.name}</strong>? They will lose access to the system.
            </p>
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn flex-1 text-white"
                style={{ background: 'var(--danger)' }}
                onClick={() => handleDeleteUser(deleteTarget.id)}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
