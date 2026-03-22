import type { ReactNode } from 'react'

type Color = 'primary' | 'success' | 'danger' | 'warning' | 'neutral' | 'forest' | 'terracotta' | 'sage' | 'sand' | 'amber'

interface Props {
  color?: Color
  children: ReactNode
  className?: string
}

const colorStyle: Record<Color, { background: string; color: string }> = {
  primary:    { background: 'var(--primary-bg)',  color: 'var(--primary)' },
  success:    { background: 'var(--success-bg)',  color: 'var(--success)' },
  danger:     { background: 'var(--danger-bg)',   color: 'var(--danger)' },
  warning:    { background: 'var(--warning-bg)',  color: 'var(--warning)' },
  neutral:    { background: 'var(--surface-raised)', color: 'var(--text-2)' },
  // legacy aliases
  forest:     { background: 'var(--primary-bg)',  color: 'var(--primary)' },
  terracotta: { background: 'var(--danger-bg)',   color: 'var(--danger)' },
  sage:       { background: 'var(--success-bg)',  color: 'var(--success)' },
  sand:       { background: 'var(--surface-raised)', color: 'var(--text-2)' },
  amber:      { background: 'var(--warning-bg)',  color: 'var(--warning)' },
}

export default function Badge({ color = 'neutral', children, className = '' }: Props) {
  return (
    <span className={`badge ${className}`} style={colorStyle[color]}>
      {children}
    </span>
  )
}
