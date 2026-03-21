import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className = '', ...props }: Props) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
          {label}
        </label>
      )}
      <input
        className={`input ${className}`}
        style={error ? { borderColor: 'var(--danger)' } : undefined}
        {...props}
      />
      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
