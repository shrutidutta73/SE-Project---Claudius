import { useState } from 'react'
import type { PriceBandWithStock } from '../../types'

interface Props {
  bands: PriceBandWithStock[]
  onSelect: (band: PriceBandWithStock) => void
  onCustom: () => void
}

export default function PriceGrid({ bands, onSelect, onCustom }: Props) {
  const [flashId, setFlashId] = useState<number | null>(null)

  function handleSelect(band: PriceBandWithStock) {
    if (band.totalStock === 0) return
    setFlashId(band.id)
    onSelect(band)
    setTimeout(() => setFlashId(null), 250)
  }

  const tileBase: React.CSSProperties = {
    width: '100%',
    minHeight: '96px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '1rem',
    textAlign: 'left',
    transition: 'all 0.15s',
    cursor: 'pointer',
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {bands.map(band => {
        const isDisabled = band.totalStock === 0
        const isFlash    = flashId === band.id
        const isLow      = band.totalStock > 0 && band.totalStock <= 5

        return (
          <button
            key={band.id}
            onClick={() => handleSelect(band)}
            disabled={isDisabled}
            className="card active:scale-95"
            style={{
              ...tileBase,
              opacity:     isDisabled ? 0.35 : 1,
              cursor:      isDisabled ? 'not-allowed' : 'pointer',
              background:  isFlash ? 'var(--primary)' : 'var(--surface)',
              borderColor: isFlash ? 'var(--primary)' : undefined,
            }}
          >
            {/* Price — clamp so it never overflows the tile */}
            <span
              className="font-bold leading-none tracking-tight block truncate"
              style={{
                fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                color: isFlash ? '#fff' : 'var(--text-1)',
              }}
            >
              ₹{band.price}
            </span>

            <div className="flex items-center gap-1 mt-2">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: isFlash ? 'rgba(255,255,255,0.6)'
                    : isDisabled ? 'var(--border-strong)'
                    : isLow     ? 'var(--warning)'
                    : 'var(--success)',
                }}
              />
              <span
                className="text-xs truncate"
                style={{
                  color: isFlash ? 'rgba(255,255,255,0.8)'
                    : isLow ? 'var(--warning)'
                    : 'var(--text-3)',
                }}
              >
                {isDisabled ? 'Out of stock' : isLow ? `Only ${band.totalStock} left` : `${band.totalStock} pcs`}
              </span>
            </div>
          </button>
        )
      })}

      {/* Custom tile */}
      <button
        onClick={onCustom}
        className="card active:scale-95"
        style={{
          ...tileBase,
          cursor: 'pointer',
          borderStyle: 'dashed',
          background: 'transparent',
          boxShadow: 'none',
        }}
      >
        <span
          className="font-bold leading-none"
          style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', color: 'var(--text-3)' }}
        >
          + Custom
        </span>
        <span className="text-xs mt-2 block" style={{ color: 'var(--text-4)' }}>
          Enter price
        </span>
      </button>
    </div>
  )
}
