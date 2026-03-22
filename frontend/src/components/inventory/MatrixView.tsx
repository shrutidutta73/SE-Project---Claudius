import type { MatrixRow } from '../../types'

interface Props {
  rows: MatrixRow[]
}

function stockClass(qty: number): string {
  if (qty === 0)  return 'bg-[var(--danger)]/10 text-[var(--danger)]'
  if (qty <= 10)  return 'bg-amber-100 text-amber-700'
  return 'bg-[var(--success)]/10 text-[var(--primary)]'
}

export default function MatrixView({ rows }: Props) {
  // Collect all unique price points across all rows, sorted ascending
  const allPrices = Array.from(
    new Set(rows.flatMap(r => Object.keys(r.bands).map(Number)))
  ).sort((a, b) => a - b)

  return (
    <div className="card overflow-x-auto animate-fade-in">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] w-32 bg-[var(--surface-raised)] sticky left-0">
              Category
            </th>
            {allPrices.map(price => (
              <th
                key={price}
                className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] min-w-[80px]"
              >
                ₹{price}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.categoryId}
              className={`border-b border-[var(--border)]/60 transition-colors hover:bg-[var(--surface-raised)]/50 ${
                i === rows.length - 1 ? 'border-b-0' : ''
              }`}
            >
              <td className="px-4 py-3 font-semibold text-[var(--text-1)] bg-white sticky left-0 border-r border-[var(--border)]/40">
                {row.categoryName}
              </td>
              {allPrices.map(price => {
                const qty = row.bands[String(price)]
                return (
                  <td key={price} className="px-4 py-3 text-center">
                    {qty != null ? (
                      <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-bold ${stockClass(qty)}`}>
                        {qty}
                      </span>
                    ) : (
                      <span className="text-[var(--text-3)] text-xs">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-4 px-4 py-3 border-t border-[var(--border)]/60 bg-[var(--surface-raised)]/30">
        <span className="text-[11px] text-[var(--text-3)] font-medium uppercase tracking-wide">Stock legend</span>
        <span className="flex items-center gap-1.5 text-[11px]">
          <span className="inline-block w-3 h-3 rounded-sm bg-[var(--success)]/10 border border-[var(--success)]/30" />
          <span className="text-[var(--text-3)]">11+ in stock</span>
        </span>
        <span className="flex items-center gap-1.5 text-[11px]">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
          <span className="text-[var(--text-3)]">1–10 low</span>
        </span>
        <span className="flex items-center gap-1.5 text-[11px]">
          <span className="inline-block w-3 h-3 rounded-sm bg-[var(--danger)]/10 border border-[var(--danger)]/20" />
          <span className="text-[var(--text-3)]">0 out</span>
        </span>
      </div>
    </div>
  )
}
