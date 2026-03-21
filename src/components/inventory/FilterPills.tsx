import type { BatchFilter } from '../../types'

interface Props {
  active: BatchFilter
  onChange: (f: BatchFilter) => void
  lowStockCount?: number
}

const PILLS: { id: BatchFilter; label: string }[] = [
  { id: 'all',          label: 'All' },
  { id: 'low_stock',    label: 'Low Stock' },
  { id: 'aging',        label: 'Aging >60d' },
  { id: 'new_arrivals', label: 'New' },
]

export default function FilterPills({ active, onChange, lowStockCount }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 w-full">
      {PILLS.map(pill => {
        const isActive = active === pill.id
        return (
          <button
            key={pill.id}
            onClick={() => onChange(pill.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all"
            style={
              isActive
                ? { background: 'var(--primary)', color: '#fff' }
                : { background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }
            }
          >
            {pill.label}
            {pill.id === 'low_stock' && lowStockCount != null && lowStockCount > 0 && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                style={
                  isActive
                    ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                    : { background: 'var(--danger-bg)', color: 'var(--danger)' }
                }
              >
                {lowStockCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
