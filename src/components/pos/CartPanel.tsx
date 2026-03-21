import { useCartStore } from '../../store/cartStore'

export default function CartPanel() {
  const items = useCartStore(s => s.items)
  const updateQty = useCartStore(s => s.updateQty)
  const removeItem = useCartStore(s => s.removeItem)
  const total = useCartStore(s => s.total)
  const privacyMode = useCartStore(s => s.privacyMode)

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalAmount = total()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--border-strong)' }}>
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-4)' }}>Cart is empty</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map(item => (
        <div
          key={`${item.priceBandId}-${item.price}`}
          className="flex items-center gap-3 py-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{item.categoryName}</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{privacyMode ? '₹••••' : `₹${item.price}`} each</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => updateQty(item.priceBandId, -1)}
              className="w-7 h-7 flex items-center justify-center rounded font-bold text-sm transition-colors"
              style={{ border: '1px solid var(--border-strong)', color: 'var(--text-2)', background: 'var(--surface-raised)' }}
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-bold" style={{ color: 'var(--text-1)' }}>
              {item.quantity}
            </span>
            <button
              onClick={() => updateQty(item.priceBandId, 1)}
              className="w-7 h-7 flex items-center justify-center rounded font-bold text-sm transition-colors"
              style={{ border: '1px solid var(--border-strong)', color: 'var(--text-2)', background: 'var(--surface-raised)' }}
            >
              +
            </button>
          </div>

          <span className="text-sm font-bold w-16 text-right" style={{ color: 'var(--text-1)' }}>
            {privacyMode ? '₹••••' : `₹${item.subtotal.toLocaleString('en-IN')}`}
          </span>

          <button
            onClick={() => removeItem(item.priceBandId)}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors"
            style={{ color: 'var(--text-4)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
          Total · {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
        <span className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
          {privacyMode ? '₹••••••' : `₹${totalAmount.toLocaleString('en-IN')}`}
        </span>
      </div>
    </div>
  )
}
