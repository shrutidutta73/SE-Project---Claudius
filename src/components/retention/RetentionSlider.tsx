const NOTCHES = [7, 14, 30, 90]

interface Props {
  days: number
  onChange: (days: number) => void
}

export default function RetentionSlider({ days, onChange }: Props) {
  const index = NOTCHES.indexOf(days)
  const safeIndex = index === -1 ? 0 : index

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const i = Number(e.target.value)
    onChange(NOTCHES[i])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
          Retention Window
        </span>
        <span className="text-sm font-bold text-[var(--primary)] tabular-nums">
          {days} days
        </span>
      </div>

      <div className="relative px-1">
        {/* Custom track styling via CSS */}
        <style>{`
          .retention-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 6px;
            border-radius: 9999px;
            background: var(--border);
            outline: none;
            cursor: pointer;
          }
          .retention-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 9999px;
            background: var(--primary);
            box-shadow: 0 1px 4px rgba(45,90,39,0.35);
            cursor: grab;
            transition: box-shadow 0.15s ease, transform 0.1s ease;
          }
          .retention-slider::-webkit-slider-thumb:active {
            cursor: grabbing;
            transform: scale(1.15);
            box-shadow: 0 2px 8px rgba(45,90,39,0.45);
          }
          .retention-slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border: none;
            border-radius: 9999px;
            background: var(--primary);
            box-shadow: 0 1px 4px rgba(45,90,39,0.35);
            cursor: grab;
          }
          .retention-slider::-moz-range-track {
            height: 6px;
            border-radius: 9999px;
            background: var(--border);
          }
        `}</style>

        <input
          type="range"
          className="retention-slider"
          min={0}
          max={NOTCHES.length - 1}
          step={1}
          value={safeIndex}
          onChange={handleChange}
        />

        {/* Notch labels */}
        <div className="flex justify-between mt-2 px-0.5">
          {NOTCHES.map((n, i) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex flex-col items-center gap-0.5 transition-colors ${
                i === safeIndex
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${i === safeIndex ? 'bg-[var(--primary)]' : 'bg-[var(--border-strong)]'}`} />
              <span className="text-[11px] font-semibold tabular-nums">{n}d</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-[var(--text-3)] leading-relaxed">
        Sales records older than <strong>{days} days</strong> will be automatically scrubbed.
        GST-required records are always retained regardless of this setting.
      </p>
    </div>
  )
}
