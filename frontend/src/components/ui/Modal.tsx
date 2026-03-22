import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      />

      {/* Sheet / Dialog */}
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full md:max-w-lg md:mx-4 animate-slide-up z-10 max-h-[92vh] overflow-y-auto"
        style={{
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border)',
          boxShadow: '0 -8px 40px rgba(15,23,42,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset',
        }}
      >
        {/* Mobile drag handle */}
        <div className="flex md:hidden justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
        </div>

        {/* Desktop radius */}
        <style>{`@media(min-width:768px){.modal-inner{border-radius:20px!important;}}`}</style>

        {title && (
          <div
            className="flex items-center justify-between px-6 pt-5 pb-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-3)', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
