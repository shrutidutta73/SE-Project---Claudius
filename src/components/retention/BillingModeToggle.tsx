import type { BillingMode } from '../../types'

interface Props {
  mode: BillingMode
  onChange: (m: BillingMode) => void
}

interface ModeCard {
  id: BillingMode
  title: string
  description: string
  note?: string
  icon: React.ReactNode
}

const IcDatabase = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
)

const IcLock = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const MODES: ModeCard[] = [
  {
    id: 'structured',
    title: 'Structured',
    description: 'Keep all records permanently',
    icon: IcDatabase,
  },
  {
    id: 'ephemeral',
    title: 'Ephemeral',
    description: 'Auto-scrub after retention window',
    note: 'GST-safe: mandatory records are never deleted',
    icon: IcLock,
  },
]

export default function BillingModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      {MODES.map(m => {
        const isSelected = mode === m.id
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`flex-1 text-left rounded-xl border-2 p-4 transition-all ${
              isSelected
                ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                : 'border-[var(--border)] bg-white hover:border-[var(--border-strong)]'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className={isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-3)]'}>
                {m.icon}
              </span>
              <span className={`font-bold text-sm ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-1)]'}`}>
                {m.title}
              </span>
              <span className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isSelected ? 'border-[var(--primary)]' : 'border-[var(--border-strong)]'
              }`}>
                {isSelected && <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
              </span>
            </div>
            <p className="text-xs text-[var(--text-2)] leading-relaxed">{m.description}</p>
            {m.note && (
              <p className="mt-1.5 text-[10px] font-semibold text-[var(--success)] uppercase tracking-wide">{m.note}</p>
            )}
          </button>
        )
      })}
    </div>
  )
}
