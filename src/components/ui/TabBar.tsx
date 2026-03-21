interface Tab {
  id: string
  label: string
  count?: number
}

interface Props {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export default function TabBar({ tabs, active, onChange, className = '' }: Props) {
  return (
    <div
      className={`flex overflow-x-auto scrollbar-none w-full ${className}`}
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap flex-shrink-0 border-b-2 -mb-px transition-colors"
          style={
            active === tab.id
              ? { borderColor: 'var(--primary)', color: 'var(--primary)' }
              : { borderColor: 'transparent', color: 'var(--text-3)' }
          }
        >
          {tab.label}
          {tab.count != null && (
            <span
              className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={
                active === tab.id
                  ? { background: 'var(--primary-bg)', color: 'var(--primary)' }
                  : { background: 'var(--surface-raised)', color: 'var(--text-4)' }
              }
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
