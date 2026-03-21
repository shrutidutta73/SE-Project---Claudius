interface Props {
  onKey: (key: string) => void
  display: string
  onAdd: () => void
}

const ROWS = [['7','8','9'], ['4','5','6'], ['1','2','3']]

const keyBtn: React.CSSProperties = {
  width: '100%',
  padding: '0.875rem 0',
  borderRadius: '0.5rem',
  fontSize: 'clamp(1rem, 4vw, 1.25rem)',
  fontWeight: 700,
  background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  color: 'var(--text-1)',
  cursor: 'pointer',
  transition: 'background 0.1s',
  touchAction: 'manipulation',
}

export default function Keypad({ onKey, display, onAdd }: Props) {
  return (
    <div className="card p-3 flex flex-col gap-2 animate-scale-in w-full">
      {/* Display */}
      <div
        className="rounded-lg px-4 py-3 text-right w-full"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
      >
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: 'clamp(1.5rem, 8vw, 2.25rem)', color: 'var(--text-1)' }}
        >
          {display ? `₹${display}` : <span style={{ color: 'var(--text-4)' }}>₹0</span>}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        {ROWS.map((row, ri) => (
          <div key={ri} className="grid grid-cols-3 gap-1.5 w-full">
            {row.map(key => (
              <button key={key} onClick={() => onKey(key)} style={keyBtn}>{key}</button>
            ))}
          </div>
        ))}

        <div className="grid grid-cols-3 gap-1.5 w-full">
          <button
            onClick={() => onKey('CLR')}
            style={{ ...keyBtn, background: 'var(--danger-bg)', border: 'none', color: 'var(--danger)', fontSize: '0.875rem' }}
          >
            CLR
          </button>
          <button onClick={() => onKey('0')} style={keyBtn}>0</button>
          <button
            onClick={() => onKey('DEL')}
            style={{ ...keyBtn }}
            className="flex items-center justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
              <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
            </svg>
          </button>
        </div>

        <button
          onClick={onAdd}
          disabled={!display}
          className="btn btn-primary w-full"
          style={{ padding: '0.875rem', fontSize: '0.9375rem', marginTop: '0.25rem' }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  )
}
