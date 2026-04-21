import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/roleStore'
import type { BillingMode, AuditLogEntry, Store, User } from '../types'
import { api } from '../lib/api'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import BillingModeToggle from '../components/retention/BillingModeToggle'
import RetentionSlider from '../components/retention/RetentionSlider'
import DangerZone from '../components/retention/DangerZone'
import AuditLog from '../components/retention/AuditLog'
import LogoCropModal from '../components/ui/LogoCropModal'
import AvatarUpload from '../components/ui/AvatarUpload'

export default function SettingsPage() {
  const role        = useAuthStore(s => s.currentUser?.role)
  const currentUser = useAuthStore(s => s.currentUser)

  const [storeData, setStoreData] = useState<Store | null>(null)
  const [auditLog, setAuditLog]   = useState<AuditLogEntry[]>([])

  useEffect(() => {
    api.get<Store>('/store').then(s => {
      setStoreData(s)
      setBillingMode(s.billingMode)
      setRetentionDays(s.retentionDays ?? 14)
      setShopName(s.name)
      setShopAddress(s.address)
      setShopLogo(s.logo ?? undefined)
    }).catch(console.error)

    api.get<AuditLogEntry[]>('/audit/log').then(setAuditLog).catch(console.error)
  }, [])

  // Owner profile edit
  const [editingProfile, setEditingProfile] = useState(false)
  const [profName,    setProfName]    = useState(currentUser?.name ?? '')
  const [profPhone,   setProfPhone]   = useState(currentUser?.phone ?? '')
  const [profEmail,   setProfEmail]   = useState(currentUser?.email ?? '')
  const [profPwdOld,  setProfPwdOld]  = useState('')
  const [profPwdNew,  setProfPwdNew]  = useState('')
  const [showOld,     setShowOld]     = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [profErr,     setProfErr]     = useState('')

  // Logo crop state
  const [rawLogoSrc,  setRawLogoSrc]  = useState<string | undefined>()

  const [billingMode, setBillingMode]       = useState<BillingMode>('ephemeral')
  const [retentionDays, setRetentionDays]   = useState<number>(14)
  const [backdate, setBackdate]             = useState(false)
  const [saved, setSaved]                   = useState(false)
  const [toast, setToast]                   = useState<string | null>(null)

  // Shop details edit state
  const [editingShop, setEditingShop] = useState(false)
  const [shopName,    setShopName]    = useState('')
  const [shopAddress, setShopAddress] = useState('')
  const [shopLogo,    setShopLogo]    = useState<string | undefined>()
  const [shopErr,     setShopErr]     = useState('')

  function handleLogoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setRawLogoSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setShopLogo(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleShopSave() {
    if (!shopName.trim())    { setShopErr('Store name is required.'); return }
    if (!shopAddress.trim()) { setShopErr('Address is required.'); return }
    try {
      const updated = await api.patch<Store>('/store', { name: shopName.trim(), address: shopAddress.trim(), logo: shopLogo })
      setStoreData(updated)
      setEditingShop(false)
      setShopErr('')
      showToast('Store details updated.')
    } catch (err) { setShopErr(err instanceof Error ? err.message : 'Failed to save.') }
  }

  async function handleProfileSave() {
    if (!profName.trim())            { setProfErr('Name is required.'); return }
    if (!/^\d{10}$/.test(profPhone)) { setProfErr('Enter a valid 10-digit phone number.'); return }
    if (profEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profEmail)) { setProfErr('Enter a valid email address.'); return }
    if (profPwdNew) {
      if (!profPwdOld) { setProfErr('Enter your current password to set a new one.'); return }
      if (profPwdNew.length < 6) { setProfErr('New password must be at least 6 characters.'); return }
    }
    try {
      await api.patch<User>(`/users/${currentUser!.id}`, { name: profName.trim(), phone: profPhone.trim(), email: profEmail.trim() || undefined })
      if (profPwdNew) {
        await api.patch(`/users/${currentUser!.id}/password`, { currentPassword: profPwdOld, newPassword: profPwdNew })
      }
      setEditingProfile(false)
      setProfErr('')
      setProfPwdOld('')
      setProfPwdNew('')
      showToast('Profile updated.')
    } catch (err) { setProfErr(err instanceof Error ? err.message : 'Failed to save.') }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSave() {
    try {
      // Single atomic PATCH — billingMode, retentionDays (for ephemeral),
      // and backdate all apply in one transaction on the server.
      await api.patch('/store/billing-mode', {
        billingMode,
        retentionDays: billingMode === 'ephemeral' ? retentionDays : undefined,
        backdate,
      })
      setSaved(true)
      showToast(
        backdate
          ? 'Settings saved. Existing sales updated to match the new mode.'
          : 'Settings saved successfully.',
      )
      setBackdate(false)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) { showToast(err instanceof Error ? err.message : 'Failed to save settings.') }
  }

  async function handleWipe(password: string) {
    try {
      const entry = await api.post<AuditLogEntry>('/audit/wipe', { password })
      setAuditLog(prev => [entry, ...prev])
      showToast(`Data wipe complete. ${entry.recordsPruned} records pruned.`)
    } catch (err) { showToast(err instanceof Error ? err.message : 'Wipe failed.') }
  }

  return (
    <div className="animate-fade-in flex flex-col gap-8">

      {/* ── Shop Details (owner only) ─────────────────────────── */}
      {role === 'owner' && storeData && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Store Details</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Your store's public information</p>
            </div>
            {!editingShop && (
              <button
                onClick={() => { setShopName(storeData.name); setShopAddress(storeData.address); setEditingShop(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
            )}
          </div>

          <div className="card p-5 flex flex-col gap-4">
            {editingShop ? (
              <>
                {/* Logo upload in edit mode */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Store Logo</label>
                  <label className="flex items-center gap-4 cursor-pointer rounded-xl px-4 py-3" style={{ border: '1.5px dashed var(--border)', background: 'var(--bg)' }}>
                    {shopLogo ? (
                      <img src={shopLogo} alt="logo" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-bg)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{shopLogo ? 'Change logo' : 'Upload logo'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Tap to select &amp; crop</p>
                    </div>
                    {shopLogo && (
                      <button type="button" onClick={e => { e.preventDefault(); setShopLogo(undefined) }} className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--danger)', border: '1px solid var(--border)' }}>Remove</button>
                    )}
                    <input type="file" accept="image/*" className="sr-only" onChange={handleLogoFileSelect} />
                  </label>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Store Name</label>
                  <input className="input" value={shopName} onChange={e => { setShopName(e.target.value); setShopErr('') }} placeholder="e.g. Sharma Garments" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Address</label>
                  <input className="input" value={shopAddress} onChange={e => { setShopAddress(e.target.value); setShopErr('') }} placeholder="Full address" />
                </div>
                {shopErr && <p className="text-xs" style={{ color: 'var(--danger)' }}>{shopErr}</p>}
                <div className="flex gap-2">
                  <button className="btn btn-ghost flex-1 text-sm" onClick={() => { setEditingShop(false); setShopErr('') }}>Cancel</button>
                  <button className="btn btn-primary flex-1 text-sm" onClick={handleShopSave}>Save</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {/* Logo — click to replace directly */}
                  <label className="cursor-pointer relative group flex-shrink-0" title="Click to change logo">
                    {storeData.logo ? (
                      <img src={storeData.logo} alt={storeData.name} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base" style={{ background: 'var(--primary)' }}>
                        {storeData.name[0].toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.45)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <input type="file" accept="image/*" className="sr-only" onChange={handleLogoFileSelect} />
                  </label>
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{storeData.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Registered store</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-start gap-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-4)' }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>{storeData.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-4)' }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                      Registered {new Date(storeData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── Owner Profile ────────────────────────────────────────── */}
      {role === 'owner' && currentUser && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Your Profile</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Name, contact & password</p>
            </div>
            {!editingProfile && (
              <button
                onClick={() => { setProfName(currentUser.name); setProfPhone(currentUser.phone); setProfEmail(currentUser.email ?? ''); setEditingProfile(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
            )}
          </div>

          <div className="card p-5 flex flex-col gap-4">
            {editingProfile ? (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Full Name</label>
                  <input className="input" value={profName} onChange={e => { setProfName(e.target.value); setProfErr('') }} placeholder="Your name" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Phone Number</label>
                  <input className="input" type="tel" value={profPhone} onChange={e => { setProfPhone(e.target.value); setProfErr('') }} placeholder="10-digit mobile" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Email</label>
                  <input className="input" type="email" value={profEmail} onChange={e => { setProfEmail(e.target.value); setProfErr('') }} placeholder="email@example.com" />
                </div>
                <div className="h-px" style={{ background: 'var(--border)' }} />
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-4)' }}>Change Password</p>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Current Password</label>
                  <div className="relative">
                    <input className="input pr-10" type={showOld ? 'text' : 'password'} value={profPwdOld} onChange={e => { setProfPwdOld(e.target.value); setProfErr('') }} placeholder="Current password" />
                    <button type="button" onClick={() => setShowOld(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }}>
                      {showOld ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>New Password</label>
                  <div className="relative">
                    <input className="input pr-10" type={showNew ? 'text' : 'password'} value={profPwdNew} onChange={e => { setProfPwdNew(e.target.value); setProfErr('') }} placeholder="Min. 6 characters" />
                    <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-4)' }}>
                      {showNew ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                </div>
                {profErr && <p className="text-xs" style={{ color: 'var(--danger)' }}>{profErr}</p>}
                <div className="flex gap-2">
                  <button className="btn btn-ghost flex-1 text-sm" onClick={() => { setEditingProfile(false); setProfErr(''); setProfPwdOld(''); setProfPwdNew('') }}>Cancel</button>
                  <button className="btn btn-primary flex-1 text-sm" onClick={handleProfileSave}>Save</button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <AvatarUpload
                    name={currentUser.name}
                    avatar={currentUser.avatar}
                    size={40}
                    onSave={async (dataUrl) => {
                      await api.patch(`/users/${currentUser.id}/avatar`, { avatar: dataUrl })
                    }}
                  />
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{currentUser.name}</p>
                    <p className="text-xs capitalize mt-0.5" style={{ color: 'var(--text-3)' }}>{currentUser.role}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  {currentUser.email && (
                    <div className="flex items-center gap-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-4)', flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      <p className="text-sm" style={{ color: 'var(--text-2)' }}>{currentUser.email}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-4)', flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>{currentUser.phone}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Data & Privacy ─────────────────────────────────────── */}
      <section>
      {/* Info banner — only shown to non-owners accessing this page */}
      {role !== 'owner' && (
        <div className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-xl" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="text-sm" style={{ color: 'var(--text-3)' }}>
            Changes here affect billing and data for all users.
          </span>
        </div>
      )}

      <PageHeader
        title="Data & Privacy"
        subtitle="Configure retention and billing mode"
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-6 items-start">

        {/* Left: Config */}
        <div className="flex flex-col gap-5">
          {/* Billing Mode */}
          <div className="card px-5 py-5 flex flex-col gap-4">
            <div>
              <h2 className="font-bold text-sm text-[var(--text-1)]">Billing Mode</h2>
              <p className="text-xs text-[var(--text-3)] mt-0.5">
                Controls how customer transaction records are stored.
              </p>
            </div>
            <BillingModeToggle mode={billingMode} onChange={setBillingMode} />

            {/* Backdate toggle — opt-in retroactive apply to historical sales */}
            <label
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
              style={{
                background: backdate ? 'var(--warning-bg)' : 'var(--surface-raised)',
                border: `1px solid ${backdate ? 'var(--warning-border)' : 'var(--border)'}`,
              }}
            >
              <input
                type="checkbox"
                checked={backdate}
                onChange={e => setBackdate(e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--warning)' }}
              />
              <div className="flex-1 text-xs leading-relaxed">
                <p className="font-semibold" style={{ color: backdate ? 'var(--warning)' : 'var(--text-2)' }}>
                  Apply to existing records too
                </p>
                <p style={{ color: 'var(--text-3)' }} className="mt-0.5">
                  {billingMode === 'ephemeral'
                    ? 'All past sales will be marked ephemeral and given an expiry of sale date + retention. Eligible for the next data wipe.'
                    : 'All past sales will be marked structured and lose their expiry. Future wipes won’t touch them.'}
                </p>
              </div>
            </label>
          </div>

          {/* Retention Slider — only for ephemeral */}
          {billingMode === 'ephemeral' && (
            <div className="card px-5 py-5 animate-slide-up">
              <RetentionSlider days={retentionDays} onChange={setRetentionDays} />
            </div>
          )}

          {/* Save button */}
          <Button
            variant="primary"
            onClick={handleSave}
            className={`self-start transition-all ${saved ? 'opacity-60' : ''}`}
            disabled={saved}
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>

          {/* Danger Zone — owner only */}
          {role === 'owner' && <DangerZone onWipe={handleWipe} />}
        </div>

        {/* Right: Audit Log */}
        <div className="md:sticky md:top-28">
          <AuditLog entries={auditLog} />
        </div>
      </div>
      </section>

      {/* Logo crop modal */}
      {rawLogoSrc && (
        <LogoCropModal
          src={rawLogoSrc}
          onConfirm={async (cropped) => {
            setShopLogo(cropped)
            try {
              const updated = await api.patch<Store>('/store', { name: storeData?.name ?? shopName, address: storeData?.address ?? shopAddress, logo: cropped })
              setStoreData(updated)
            } catch (err) { console.error(err) }
            setRawLogoSrc(undefined)
            showToast('Logo updated.')
          }}
          onClose={() => setRawLogoSrc(undefined)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium shadow-lg max-w-sm text-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
