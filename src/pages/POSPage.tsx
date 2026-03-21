import { useState } from 'react'
import type { PriceBandWithStock } from '../types'
import { MOCK_PRICE_BANDS_WITH_STOCK, MOCK_CATEGORIES } from '../lib/mock'
import { useCartStore } from '../store/cartStore'
import { useAuthStore, type Role } from '../store/roleStore'
import { useNavigate } from 'react-router-dom'
import CategoryTabs from '../components/pos/CategoryTabs'
import PriceGrid from '../components/pos/PriceGrid'
import Keypad from '../components/pos/Keypad'
import CartPanel from '../components/pos/CartPanel'
import CartDrawer from '../components/pos/CartDrawer'
import type { PaymentMethod } from '../types'

export default function POSPage() {
  const navigate   = useNavigate()
  const role       = (useAuthStore(s => s.currentUser)?.role ?? 'staff') as Role
  const clockedIn  = useAuthStore(s => s.clockedIn)
  const [activeCategory, setActiveCategory] = useState<number>(MOCK_CATEGORIES[0].id)
  const [customMode, setCustomMode] = useState(false)
  const [keyDisplay, setKeyDisplay] = useState('')
  const [successMethod, setSuccessMethod] = useState<PaymentMethod | null>(null)

  const privacyMode     = useCartStore(s => s.privacyMode)
  const togglePrivacy   = useCartStore(s => s.togglePrivacyMode)
  const addItem         = useCartStore(s => s.addItem)
  const customerName    = useCartStore(s => s.customerName)
  const customerPhone   = useCartStore(s => s.customerPhone)
  const setCustomer     = useCartStore(s => s.setCustomer)
  const checkout        = useCartStore(s => s.checkout)
  const items           = useCartStore(s => s.items)
  const total           = useCartStore(s => s.total)

  const filteredBands = MOCK_PRICE_BANDS_WITH_STOCK.filter(b => b.categoryId === activeCategory)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalAmount = total()

  const methodLabel: Record<PaymentMethod, string> = { cash: 'Cash', upi: 'UPI / QR', store_credit: 'Store Credit' }

  function handleKey(key: string) {
    if (key === 'CLR') { setKeyDisplay(''); return }
    if (key === 'DEL') { setKeyDisplay(p => p.slice(0, -1)); return }
    if (key === '.' && keyDisplay.includes('.')) return
    if (keyDisplay.length >= 8) return
    setKeyDisplay(p => p + key)
  }

  function handleKeypadAdd() {
    const price = parseFloat(keyDisplay)
    if (!price || isNaN(price) || price <= 0) return
    const catName = MOCK_CATEGORIES.find(c => c.id === activeCategory)?.name ?? 'Custom'
    addItem({ priceBandId: 0, categoryName: `Custom · ${catName}`, price })
    setKeyDisplay('')
    setCustomMode(false)
  }

  function handleBandSelect(band: PriceBandWithStock) {
    addItem({ priceBandId: band.id, categoryName: band.categoryName, price: band.price })
  }

  function handleCheckout(method: PaymentMethod) {
    checkout(method)
    setSuccessMethod(method)
    setTimeout(() => setSuccessMethod(null), 2000)
  }

  // Whether to show customer fields (owner yes, staff no — staff just bills fast)
  const showCustomer = role === 'owner' || role === 'manager'

  // Staff must be clocked in to use POS
  if (role === 'staff' && !clockedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-raised)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Not clocked in</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>You need to clock in before making sales.</p>
        </div>
        <button onClick={() => navigate('/staff')} className="btn btn-primary px-6 py-2.5 text-sm font-semibold">
          Go to Clock In
        </button>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* Page title row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>
            {role === 'staff' ? 'Quick Sale' : 'Point of Sale'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Sharma Garments</p>
        </div>

        {/* Owner gets privacy toggle; staff doesn't need it */}
        {role !== 'staff' && (
          <button
            onClick={togglePrivacy}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all"
            style={privacyMode
              ? { background: 'var(--primary)', color: '#fff' }
              : { background: 'var(--surface-raised)', color: 'var(--text-3)', border: '1px solid var(--border)' }
            }
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: privacyMode ? '#fff' : 'var(--text-4)' }} />
            Privacy {privacyMode ? 'ON' : 'OFF'}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_340px] gap-4 items-start md:items-stretch">

        {/* Left — product selection */}
        <div className="flex flex-col gap-3 min-w-0">
          <CategoryTabs
            bands={MOCK_PRICE_BANDS_WITH_STOCK}
            activeCategory={activeCategory}
            onChange={id => { setActiveCategory(id); setCustomMode(false); setKeyDisplay('') }}
          />

          {customMode && (
            <button
              onClick={() => { setCustomMode(false); setKeyDisplay('') }}
              className="flex items-center gap-1.5 text-sm font-medium self-start"
              style={{ color: 'var(--text-3)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              Back to price grid
            </button>
          )}

          {customMode
            ? <Keypad onKey={handleKey} display={keyDisplay} onAdd={handleKeypadAdd} />
            : <PriceGrid bands={filteredBands} onSelect={handleBandSelect} onCustom={() => setCustomMode(true)} />
          }
        </div>

        {/* Right — cart + checkout (desktop only) */}
        <div className="hidden md:flex flex-col gap-3 sticky top-28">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Cart</span>
              {itemCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <CartPanel />
          </div>

          {/* Customer fields — only for owner + manager */}
          {showCustomer && (
            <div className="card p-4 flex flex-col gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-4)' }}>
                Customer (optional)
              </p>
              <input className="input" placeholder="Customer name" value={customerName} onChange={e => setCustomer(e.target.value, customerPhone)} />
              <input className="input" placeholder="Phone number" type="tel" value={customerPhone} onChange={e => setCustomer(customerName, e.target.value)} />
            </div>
          )}

          {/* Payment */}
          <div className="card p-4 flex flex-col gap-2">
            {successMethod ? (
              <div className="flex flex-col items-center py-6 gap-2 animate-scale-in">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--success-bg)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Payment received</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{methodLabel[successMethod]}</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-4)' }}>Payment</p>
                <button onClick={() => handleCheckout('cash')} disabled={itemCount === 0} className="btn btn-primary w-full py-3 text-sm font-bold">
                  Cash{itemCount > 0 ? ` · ₹${totalAmount.toLocaleString('en-IN')}` : ''}
                </button>
                <button onClick={() => handleCheckout('upi')} disabled={itemCount === 0} className="btn btn-ghost w-full">
                  UPI / QR
                </button>
                <button onClick={() => handleCheckout('store_credit')} disabled={itemCount === 0} className="btn btn-ghost w-full">
                  Store Credit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile cart drawer */}
      <CartDrawer showCustomer={showCustomer} />
    </div>
  )
}
