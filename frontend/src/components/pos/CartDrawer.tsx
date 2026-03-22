import { useState } from 'react'
import { useCartStore } from '../../store/cartStore'
import Modal from '../ui/Modal'
import CartPanel from './CartPanel'
import type { PaymentMethod } from '../../types'

interface Props {
  showCustomer: boolean
}

export default function CartDrawer({ showCustomer }: Props) {
  const [open, setOpen] = useState(false)
  const [successMethod, setSuccessMethod] = useState<PaymentMethod | null>(null)
  const items        = useCartStore(s => s.items)
  const total        = useCartStore(s => s.total)
  const privacyMode  = useCartStore(s => s.privacyMode)
  const customerName = useCartStore(s => s.customerName)
  const customerPhone= useCartStore(s => s.customerPhone)
  const setCustomer  = useCartStore(s => s.setCustomer)
  const checkout     = useCartStore(s => s.checkout)

  const itemCount   = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalAmount = total()

  function handleCheckout(method: PaymentMethod) {
    checkout(method)
    setSuccessMethod(method)
    setTimeout(() => { setSuccessMethod(null); setOpen(false) }, 1500)
  }

  const methodLabel: Record<PaymentMethod, string> = { cash: 'Cash', upi: 'UPI / QR', store_credit: 'Store Credit' }

  return (
    <>
      {/* Sticky bar above bottom tab bar */}
      <div className="fixed inset-x-0 z-40 md:hidden" style={{ bottom: 'var(--bottom-tab-height)' }}>
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            minHeight: 'var(--cart-bar-height)',
          }}
        >
          <div className="flex-1 min-w-0">
            {itemCount > 0 ? (
              <>
                <p className="text-xs leading-none mb-1" style={{ color: 'var(--text-3)' }}>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </p>
                <p className="text-2xl font-bold leading-none" style={{ color: 'var(--primary)' }}>
                  {privacyMode ? '₹••••••' : `₹${totalAmount.toLocaleString('en-IN')}`}
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-4)' }}>Cart is empty</p>
            )}
          </div>
          <button
            disabled={itemCount === 0}
            className="btn btn-primary px-5 py-2.5 text-sm"
            onClick={() => itemCount > 0 && setOpen(true)}
          >
            Checkout
          </button>
        </div>
      </div>

      {/* Bottom-sheet modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Checkout">
        {successMethod ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 animate-scale-in">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--success-bg)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Payment received</p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>{methodLabel[successMethod]}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <CartPanel />

            {showCustomer && (
              <div className="flex flex-col gap-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-4)' }}>
                  Customer (optional)
                </p>
                <input className="input" placeholder="Customer name" value={customerName} onChange={e => setCustomer(e.target.value, customerPhone)} />
                <input className="input" placeholder="Phone number" type="tel" value={customerPhone} onChange={e => setCustomer(customerName, e.target.value)} />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button onClick={() => handleCheckout('cash')} disabled={itemCount === 0} className="btn btn-primary w-full py-3.5 text-base font-bold">
                Cash · ₹{totalAmount.toLocaleString('en-IN')}
              </button>
              <button onClick={() => handleCheckout('upi')} disabled={itemCount === 0} className="btn btn-ghost w-full py-3">
                UPI / QR
              </button>
              <button onClick={() => handleCheckout('store_credit')} disabled={itemCount === 0} className="btn btn-ghost w-full py-3">
                Store Credit
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
