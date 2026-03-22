import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  value: string | number
  subtext?: string
  color?: string
}

export default function StatCard({ icon, label, value, subtext, color = 'var(--primary)' }: Props) {
  return (
    <div className="card p-5 flex flex-col gap-4" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>
          {label}
        </p>
        <div style={{ color, opacity: 0.7 }}>{icon}</div>
      </div>
      <div>
        <p className="text-3xl font-black tabular-nums leading-none tracking-tight" style={{ color: 'var(--dark)' }}>
          {value}
        </p>
        {subtext && (
          <p className="text-xs mt-1.5 font-semibold" style={{ color }}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  )
}
