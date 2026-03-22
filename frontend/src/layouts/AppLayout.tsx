import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getInitials } from '../lib/utils'
import { useAuthStore, ROLE_ROUTES, ROLE_DEFAULT, type Role } from '../store/roleStore'
import { useShopStore } from '../store/shopStore'

function IcLogout()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
function IcSettings() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
function IcPOS()       { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> }
function IcInventory() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> }
function IcStaff()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function IcVendors()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> }
function IcDashboard() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
function IcSettingsNav(){ return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }

const ALL_NAV = [
  { path: '/pos',         label: 'POS',       icon: <IcPOS /> },
  { path: '/inventory',   label: 'Inventory', icon: <IcInventory /> },
  { path: '/staff',       label: 'Staff',     icon: <IcStaff /> },
  { path: '/procurement', label: 'Vendors',   icon: <IcVendors /> },
  { path: '/dashboard',   label: 'Dashboard', icon: <IcDashboard /> },
  { path: '/settings',    label: 'Settings',  icon: <IcSettingsNav /> },
]

const ROLE_NAV_ORDER: Record<Role, string[]> = {
  owner:   ['/dashboard', '/staff', '/settings'],
  staff:   ['/staff', '/pos'],
  manager: ['/dashboard', '/inventory', '/staff', '/procurement'],
}

interface Props { children: ReactNode }

export default function AppLayout({ children }: Props) {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const { currentUser, logout } = useAuthStore()
  const role = (currentUser?.role ?? 'staff') as Role
  const shops = useShopStore(s => s.shops)
  const currentStore = shops.find(s => s.id === currentUser?.storeId)

  const navItems = (ROLE_NAV_ORDER[role] ?? [])
    .map(p => ALL_NAV.find(n => n.path === p))
    .filter(Boolean) as typeof ALL_NAV

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentUser) { navigate('/login', { replace: true }); return }
    const allowed = ROLE_ROUTES[role].some(r => pathname === r || pathname.startsWith(r + '/'))
    if (!allowed) navigate(ROLE_DEFAULT[role], { replace: true })
  }, [currentUser, role, pathname, navigate])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [userMenuOpen])

  const isActive = (p: string) => pathname === p || pathname.startsWith(p + '/')

  function handleLogout() { setUserMenuOpen(false); logout(); navigate('/login', { replace: true }) }

  if (!currentUser) return null

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>

      {/* ════════════════════════════════════════
          DESKTOP — two-row navbar (md+)
      ════════════════════════════════════════ */}
      <header
        className="hidden md:block fixed top-0 inset-x-0 z-50"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        {/* Row 1 — brand + user */}
        <div className="h-14 flex items-center px-5 gap-3">
          <div className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer" onClick={() => navigate(ROLE_DEFAULT[role])}>
            {currentStore?.logo ? (
              <img src={currentStore.logo} alt={currentStore.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: 'var(--primary)' }}>
                {(currentStore?.name ?? 'S')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold leading-none" style={{ color: 'var(--text-1)' }}>{currentStore?.name ?? 'SmallBiz'}</p>
              <p className="text-[10px] mt-0.5 leading-none capitalize" style={{ color: 'var(--text-4)' }}>{currentUser.role}</p>
            </div>
          </div>

          <div className="h-6 w-px flex-shrink-0" style={{ background: 'var(--border)' }} />
          <div className="flex-1" />

          {role === 'owner' && (
            <button onClick={() => navigate('/settings')} className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ color: 'var(--text-3)' }}>
              <IcSettings />
            </button>
          )}

          <div className="relative flex-shrink-0" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ background: userMenuOpen ? 'var(--canvas)' : 'transparent' }}
            >
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'var(--primary)' }}>
                  {getInitials(currentUser.name)}
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-semibold leading-none max-w-[120px] truncate" style={{ color: 'var(--text-1)' }}>{currentUser.name}</p>
                <p className="text-[10px] mt-0.5 leading-none capitalize" style={{ color: 'var(--text-4)' }}>{currentUser.role}</p>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl overflow-hidden z-50 animate-scale-in"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--canvas)' }}>
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-1)' }}>{currentUser.name}</p>
                  <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-4)' }}>{currentUser.role}</p>
                </div>
                <div className="py-1">
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors"
                    style={{ color: 'var(--text-2)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLElement).style.background = 'var(--danger-bg)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <IcLogout /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2 — nav links (text only, no icons) */}
        <nav className="h-10 flex items-center px-4 gap-0.5" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {navItems.map(item => {
            const active = isActive(item.path)
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all"
                style={active ? { background: 'var(--primary)', color: '#fff' } : { color: 'var(--text-3)' }}
              >
                {item.label}
              </button>
            )
          })}
        </nav>
      </header>

      {/* ════════════════════════════════════════
          MOBILE — top bar + bottom tabs
      ════════════════════════════════════════ */}

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-50 flex items-center px-4 gap-3"
        style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {currentStore?.logo ? (
          <img src={currentStore.logo} alt={currentStore.name} className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: 'var(--primary)' }}>
            {(currentStore?.name ?? 'S')[0].toUpperCase()}
          </div>
        )}
        <span className="font-semibold text-sm flex-1 truncate" style={{ color: 'var(--text-1)' }}>
          {currentStore?.name ?? 'SmallBiz'}
        </span>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
          style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>
          <IcLogout /> Sign out
        </button>
      </header>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center"
        style={{ height: 60, background: 'var(--surface)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map(item => {
          const active = isActive(item.path)
          return (
            <button key={item.path} onClick={() => navigate(item.path)} className="flex-1 flex flex-col items-center justify-center gap-1">
              <div style={{ padding: '4px 12px', borderRadius: 20, background: active ? 'var(--primary-bg)' : 'transparent', transition: 'background 0.15s' }}>
                <span style={{ color: active ? 'var(--primary)' : 'var(--text-4)', display: 'block' }}>{item.icon}</span>
              </div>
              <span className="text-[10px] font-semibold leading-none" style={{ color: active ? 'var(--primary)' : 'var(--text-4)' }}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ── Page content ── */}
      <main className="md:pt-[96px] pt-[56px] md:pb-12 pb-[68px]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-5 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
