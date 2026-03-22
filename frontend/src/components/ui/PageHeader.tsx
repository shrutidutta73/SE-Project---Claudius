import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text-3)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">{actions}</div>}
    </div>
  )
}
