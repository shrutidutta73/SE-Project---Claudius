import { useState, useEffect } from 'react'
import type { User, Store } from '../../types'
import type { GpsPolicy } from '../../store/gpsSettingsStore'
import { getInitials, haversineDistanceM } from '../../lib/utils'

interface Props {
  user:       User
  store:      Store
  clockedIn:  boolean
  gpsPolicy?: GpsPolicy
  onClock:    (action: 'in' | 'out') => void
}

export default function ClockWidget({ user, store, clockedIn, gpsPolicy, onClock }: Props) {
  const [distanceM, setDistanceM] = useState<number | null>(null)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const gpsConfigured = store.gpsLatitude !== 0 || store.gpsLongitude !== 0

  useEffect(() => {
    if (!gpsConfigured) { setDistanceM(null); return }
    if (!navigator.geolocation) { setDistanceM(0); return }
    navigator.geolocation.getCurrentPosition(
      pos => setDistanceM(Math.round(haversineDistanceM(pos.coords.latitude, pos.coords.longitude, store.gpsLatitude, store.gpsLongitude))),
      () => setDistanceM(0),
    )
  }, [store.gpsLatitude, store.gpsLongitude, gpsConfigured])

  const inRange = !gpsConfigured || (distanceM !== null && distanceM <= store.gpsRadiusM)

  // GPS enforcement check for the next action
  const nextAction = clockedIn ? 'out' : 'in'
  const gpsRequired = nextAction === 'in'
    ? (gpsPolicy?.requireOnClockIn ?? false)
    : (gpsPolicy?.requireOnClockOut ?? false)
  const gpsBlocked = gpsRequired && distanceM !== null && !inRange

  const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col gap-8 py-2 w-full animate-fade-in">

      {/* Time block */}
      <div className="text-center">
        <p className="tabular-nums font-black leading-none" style={{ fontSize: 56, letterSpacing: '-0.04em', color: 'var(--dark)' }}>
          {timeStr}
        </p>
        <p className="text-sm font-medium mt-2" style={{ color: 'var(--text-4)', letterSpacing: '0.01em' }}>
          {dateStr}
        </p>
      </div>

      {/* Avatar + identity */}
      <div className="flex flex-col items-center gap-4">
        <div style={{ position: 'relative' }}>
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 8px 24px rgba(79,70,229,0.28)' }}
            />
          ) : (
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 28, fontWeight: 800,
              boxShadow: '0 8px 24px rgba(79,70,229,0.28)',
            }}>
              {getInitials(user.name)}
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: 3, right: 3,
            width: 18, height: 18, borderRadius: '50%',
            background: clockedIn ? 'var(--success)' : '#94A3B8',
            border: '2.5px solid var(--canvas)',
            boxShadow: clockedIn ? '0 2px 6px rgba(5,150,105,0.4)' : 'none',
          }} />
        </div>

        <div className="text-center flex flex-col items-center gap-2">
          <p className="text-lg font-bold tracking-tight" style={{ color: 'var(--dark)' }}>{user.name}</p>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>{user.role}</p>

          {/* Location pill — only shown when store GPS is configured */}
          {gpsConfigured && distanceM === null && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-strong)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>Checking location…</span>
            </div>
          )}
          {gpsConfigured && distanceM !== null && inRange && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>Within range</span>
            </div>
          )}
          {gpsConfigured && distanceM !== null && !inRange && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-strong)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{distanceM}m from store</span>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* Action */}
      <div className="flex flex-col gap-2.5">
        <button
          onClick={() => !gpsBlocked && onClock(clockedIn ? 'out' : 'in')}
          disabled={gpsBlocked}
          style={{
            width: '100%',
            padding: '0.875rem',
            borderRadius: 12,
            fontSize: '0.9375rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            border: clockedIn ? '1.5px solid var(--border-strong)' : 'none',
            cursor: gpsBlocked ? 'not-allowed' : 'pointer',
            background: gpsBlocked ? 'var(--border)' : clockedIn ? 'var(--surface)' : 'var(--primary)',
            color: gpsBlocked ? 'var(--text-4)' : clockedIn ? 'var(--danger)' : '#fff',
            boxShadow: (!gpsBlocked && !clockedIn) ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
            transition: 'all 0.15s ease',
            opacity: gpsBlocked ? 0.7 : 1,
          }}
        >
          {clockedIn ? 'Clock Out' : 'Clock In'}
        </button>

        {gpsBlocked && (
          <p className="text-xs text-center font-medium" style={{ color: 'var(--danger)' }}>
            GPS required — you must be within {store.gpsRadiusM}m of the store
          </p>
        )}
        {!gpsBlocked && clockedIn && (
          <p className="text-xs text-center font-medium" style={{ color: 'var(--text-4)' }}>
            Shift in progress
          </p>
        )}
      </div>
    </div>
  )
}
