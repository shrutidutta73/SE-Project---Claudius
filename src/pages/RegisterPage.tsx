import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShopStore } from '../store/shopStore'
import { useUsersStore } from '../store/usersStore'
import { useCredStore } from '../store/credentialsStore'
import LogoCropModal from '../components/ui/LogoCropModal'

// ── Right decorative panel ──────────────────────────────────────────────────
function RightPanel() {
  return (
    <div
      className="hidden md:flex flex-col justify-center px-14 relative overflow-hidden"
      style={{ background: 'var(--dark)' }}
    >
      <div style={{ position: 'absolute', top: '-120px', right: '-120px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'absolute', bottom: '-100px', left: '-80px',  width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'absolute', top: '45%',    right: '-60px',    width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-xl mb-8"
          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
          B
        </div>
        <h2 className="text-3xl font-black text-white leading-snug mb-3">Your store,<br />up in minutes.</h2>
        <p className="text-sm leading-relaxed mb-10 max-w-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Set up your store and owner account in one step. Invite managers, onboard staff, and start billing immediately.
        </p>
        <div className="flex flex-col gap-3.5">
          {['No hardware required','Works on any phone or tablet','Multi-staff, multi-role access','Data stays private and secure'].map(f => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate    = useNavigate()
  const { shops, addShop } = useShopStore()
  const { users, addUser } = useUsersStore()
  const { setPassword: storePassword } = useCredStore()

  const [shopName,   setShopName]   = useState('')
  const [address,    setAddress]    = useState('')
  const [ownerName,  setOwnerName]  = useState('')
  const [email,      setEmail]      = useState('')
  const [phone,      setPhone]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [logo,       setLogo]       = useState<string | undefined>()
  const [rawSrc,     setRawSrc]     = useState<string | undefined>()   // raw file before crop
  const [err,        setErr]        = useState('')
  const [loading,    setLoading]    = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setRawSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function validate() {
    if (!logo)         return 'Store logo is required.'
    if (!shopName.trim())  return 'Store name is required.'
    if (!address.trim())   return 'Address is required.'
    if (!ownerName.trim()) return 'Owner name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.'
    if (!/^\d{10}$/.test(phone)) return 'Enter a valid 10-digit phone number.'
    if (password.length < 6) return 'Password must be at least 6 characters.'
    if (shops.some(s => s.name.toLowerCase() === shopName.trim().toLowerCase())) return 'A store with this name already exists.'
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const error = validate()
    if (error) { setErr(error); return }
    setLoading(true)
    setTimeout(() => {
      const newShopId = Math.max(...shops.map(s => s.id)) + 1
      const newUserId = Math.max(...users.map(u => u.id)) + 1
      addShop({ id: newShopId, name: shopName.trim(), address: address.trim(), ownerId: newUserId, logo })
      addUser({ name: ownerName.trim(), phone: phone.trim(), email: email.trim(), role: 'owner', storeId: newShopId })
      storePassword(newUserId, password)
      navigate('/login', { state: { registered: true } })
    }, 400)
  }

  return (
    <div className="min-h-screen md:h-screen md:grid md:grid-cols-2" style={{ background: 'var(--bg)' }}>

      {/* Left: decorative */}
      <RightPanel />

      {/* Right: form */}
      <div className="flex items-center justify-center min-h-screen md:min-h-0 overflow-y-auto px-6 md:px-14 py-12">

        <div className="w-full max-w-[360px]">

          <div className="flex flex-col mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl mb-3" style={{ background: 'var(--primary)' }}>B</div>
            <p className="text-xl font-black" style={{ color: 'var(--text-1)' }}>SmallBiz</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Operations Platform</p>
          </div>

          <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-1)' }}>Register your store</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>All fields are required.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* ── Store Details ─────────────────────────────── */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-4)' }}>Store Details</p>

              {/* Logo upload */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                  Store Logo <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <label
                  className="flex items-center gap-4 cursor-pointer rounded-xl px-4 py-3 transition-colors"
                  style={{ border: `1.5px dashed ${logo ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--bg)' }}
                >
                  {logo ? (
                    <img src={logo} alt="logo" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-bg)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                      {logo ? 'Change logo' : 'Upload logo'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>PNG, JPG — tap to select &amp; crop</p>
                  </div>
                  {logo && (
                    <button type="button" onClick={e => { e.preventDefault(); setLogo(undefined) }}
                      className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
                      style={{ color: 'var(--danger)', border: '1px solid var(--border)' }}>
                      Remove
                    </button>
                  )}
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
                </label>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Store Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="input" placeholder="e.g. Sharma Garments" value={shopName} onChange={e => { setShopName(e.target.value); setErr('') }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="input" placeholder="Full address" value={address} onChange={e => { setAddress(e.target.value); setErr('') }} />
              </div>
            </div>

            {/* ── Owner Account ─────────────────────────────── */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-4)' }}>Owner Account</p>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="input" placeholder="Owner's full name" value={ownerName} onChange={e => { setOwnerName(e.target.value); setErr('') }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="input" type="email" placeholder="owner@yourstore.com" value={email} onChange={e => { setEmail(e.target.value); setErr('') }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Phone Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="input" type="tel" placeholder="10-digit mobile" value={phone} onChange={e => { setPhone(e.target.value); setErr('') }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Password <span style={{ color: 'var(--danger)' }}>*</span></label>
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
            </div>

            {err && <p className="text-sm" style={{ color: 'var(--danger)' }}>{err}</p>}

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-sm font-bold">
              {loading ? 'Creating your store…' : 'Create Store & Account'}
            </button>
          </form>

          <p className="text-sm mt-6" style={{ color: 'var(--text-3)' }}>
            Already registered?{' '}
            <button onClick={() => navigate('/login')} className="font-semibold" style={{ color: 'var(--primary)' }}>Sign in</button>
          </p>
        </div>
      </div>

      {/* Crop modal — opens when file is selected */}
      {rawSrc && (
        <LogoCropModal
          src={rawSrc}
          onConfirm={cropped => { setLogo(cropped); setRawSrc(undefined); setErr('') }}
          onClose={() => setRawSrc(undefined)}
        />
      )}
    </div>
  )
}
