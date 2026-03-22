import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, ROLE_DEFAULT } from '../store/roleStore'
import { useUsersStore } from '../store/usersStore'
import { useCredStore } from '../store/credentialsStore'

// ── Left panel ──────────────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div
      className="hidden md:flex flex-col justify-between px-14 py-16 relative overflow-hidden"
      style={{ background: 'var(--dark)' }}
    >
      <div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg mb-12"
          style={{ background: 'var(--primary)' }}
        >
          B
        </div>
        <h2 className="text-4xl font-black text-white leading-tight mb-4">
          Run your store.<br />Not spreadsheets.
        </h2>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 320 }}>
          Billing, staff, inventory, and compliance — in one place built for Indian retail.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {[
          { label: 'Fast POS billing', sub: 'Bill customers in seconds, not minutes' },
          { label: 'Staff management', sub: 'Clock-in, roles, leaderboards' },
          { label: 'Inventory control', sub: 'Real-time stock across categories' },
        ].map(f => (
          <div key={f.label} className="flex items-start gap-3">
            <div
              className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
              style={{ background: 'var(--primary)' }}
            >
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{f.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PIN sheet ───────────────────────────────────────────────────────────────
const PAD_KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

function PinSheet({ onClose, onVerify, error, loading }: {
  onClose: () => void
  onVerify: (pin: string) => void
  error: string
  loading: boolean
}) {
  const [pin, setPin] = useState('')
  const [animate, setAnimate] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setAnimate(true)) }, [])
  useEffect(() => { if (pin.length === 4) onVerify(pin) }, [pin]) // eslint-disable-line
  useEffect(() => { if (error) setPin('') }, [error])

  function handleClose() { setAnimate(false); setTimeout(onClose, 260) }

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: animate ? 1 : 0,
          transition: 'opacity 0.22s ease',
        }}
      />
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 48px rgba(15,23,42,0.15)',
          maxWidth: 480,
          margin: '0 auto',
          transform: animate ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>
        <div className="px-6 pb-8 pt-3 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--text-1)' }}>Enter your PIN</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>4-digit PIN to sign in</p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--canvas)', border: '1px solid var(--border)', color: 'var(--text-3)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="flex gap-3 justify-center">
            {[0,1,2,3].map(i => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < pin.length ? 'var(--primary)' : 'var(--border)', transition: 'background 0.1s' }} />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2.5" style={{ maxWidth: 240, margin: '0 auto', width: '100%' }}>
            {PAD_KEYS.map((k, i) => {
              if (!k) return <div key={i} />
              const isBack = k === '⌫'
              return (
                <button
                  key={i}
                  disabled={loading}
                  onClick={() => isBack ? setPin(p => p.slice(0,-1)) : pin.length < 4 && setPin(p => p + k)}
                  style={{
                    height: 56, borderRadius: 12,
                    fontSize: isBack ? 18 : 22, fontWeight: 600,
                    background: 'var(--canvas)',
                    border: '1px solid var(--border)',
                    color: isBack ? 'var(--text-3)' : 'var(--text-1)',
                    cursor: 'pointer', opacity: loading ? 0.5 : 1,
                    transition: 'background 0.1s',
                  }}
                >
                  {k}
                </button>
              )
            })}
          </div>

          {error && <p className="text-sm text-center font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
          {loading && <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>Verifying…</p>}
        </div>
      </div>
    </>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const registered = (location.state as { registered?: boolean } | null)?.registered

  const login  = useAuthStore(s => s.login)
  const users  = useUsersStore(s => s.users)
  const verify = useCredStore(s => s.verify)

  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [pinUser,    setPinUser]    = useState<(typeof users)[0] | null>(null)
  const [pinError,   setPinError]   = useState('')
  const [ownerUser,  setOwnerUser]  = useState<(typeof users)[0] | null>(null)

  function doLogin(user: (typeof users)[0]) {
    login(user)
    navigate(ROLE_DEFAULT[user.role as keyof typeof ROLE_DEFAULT], { replace: true })
  }

  function handleIdentifierSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier.trim()) { setError('Please enter your email or phone number.'); return }
    const found = users.find(u => u.role === 'staff' ? u.phone === identifier.trim() : u.email === identifier.trim())
    if (!found) { setError('No account found.'); return }
    setError('')
    if (found.role === 'staff') setPinUser(found)
    else setOwnerUser(found)
  }

  function handlePinVerify(pin: string) {
    if (!pinUser) return
    setLoading(true)
    setPinError('')
    setTimeout(() => {
      if (!verify(pinUser.id, pin)) { setPinError('Incorrect PIN. Try again.'); setLoading(false); return }
      doLogin(pinUser)
    }, 250)
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) { setError('Please enter your password.'); return }
    if (!ownerUser) return
    setLoading(true)
    setTimeout(() => {
      if (!verify(ownerUser.id, password)) { setError('Incorrect password.'); setLoading(false); return }
      doLogin(ownerUser)
    }, 300)
  }

  return (
    <div className="min-h-screen md:h-screen md:grid md:grid-cols-2" style={{ background: 'var(--canvas)' }}>

      <LeftPanel />

      <div className="flex items-center justify-center min-h-screen md:min-h-0 px-6 md:px-14 py-12" style={{ background: 'var(--canvas)' }}>
        <div className="w-full max-w-[360px]">

          {/* Brand mark */}
          <div className="mb-10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg mb-4 md:hidden"
              style={{ background: 'var(--primary)' }}
            >
              B
            </div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--dark)' }}>
              {ownerUser ? 'Enter password' : 'Sign in'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
              {ownerUser
                ? <>{ownerUser.name} · <span className="capitalize">{ownerUser.role}</span> · <button onClick={() => { setOwnerUser(null); setPassword(''); setError('') }} className="underline" style={{ color: 'var(--primary)' }}>Change</button></>
                : 'Enter your email or phone number'
              }
            </p>
          </div>

          {registered && !ownerUser && (
            <div className="rounded-xl px-4 py-3 text-sm font-medium mb-6" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
              Store created. Sign in to continue.
            </div>
          )}

          {/* Identifier step */}
          {!ownerUser && (
            <form onSubmit={handleIdentifierSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Email / Phone</label>
                <input className="input" type="text" placeholder="Email or 10-digit phone" value={identifier} onChange={e => { setIdentifier(e.target.value); setError('') }} autoComplete="username" autoFocus />
              </div>
              {error && <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button type="submit" className="btn btn-primary w-full" style={{ padding: '0.75rem' }}>Continue</button>
              <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>
                New store? <button type="button" onClick={() => navigate('/register')} style={{ color: 'var(--primary)', fontWeight: 600 }}>Register here</button>
              </p>
            </form>
          )}

          {/* Password step */}
          {ownerUser && (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Password</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    autoComplete="current-password"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }} tabIndex={-1}>
                    {showPass
                      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>
              {error && <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ padding: '0.75rem' }}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
      </div>

      {pinUser && (
        <PinSheet
          onClose={() => { setPinUser(null); setPinError(''); setLoading(false) }}
          onVerify={handlePinVerify}
          error={pinError}
          loading={loading}
        />
      )}
    </div>
  )
}
