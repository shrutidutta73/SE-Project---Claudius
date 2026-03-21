import type { InventoryBatchDetail } from '../../types'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatCurrencyFull } from '../../lib/utils'

interface Props {
  batches: InventoryBatchDetail[]
  onAction: (id: number, action: 'close' | 'adjust' | 'defective') => void
}

function StatusBadge({ batch }: { batch: InventoryBatchDetail }) {
  if (batch.quantityRemaining === 0) return <Badge color="terracotta">OUT</Badge>
  if (batch.ageInDays > 60)         return <Badge color="amber">AGING</Badge>
  return <Badge color="sage">ACTIVE</Badge>
}

function MarginWarning() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[var(--danger)]" title="Low margin">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </span>
  )
}

export default function BatchList({ batches, onAction }: Props) {
  if (batches.length === 0) {
    return (
      <div className="card px-6 py-12 text-center animate-fade-in">
        <p className="text-[var(--text-3)] text-sm">No batches match the current filter.</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile list */}
      <div className="flex flex-col gap-3 md:hidden stagger-children">
        {batches.map(batch => {
          const lowMargin = batch.margin != null && batch.margin < 15
          return (
            <div key={batch.id} className="card px-4 py-4">
              {/* Top row */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-bold text-[var(--text-1)] text-sm">
                  {batch.vendorName ?? 'Unknown Vendor'}
                </span>
                <Badge color="sage">{batch.categoryName}</Badge>
                <Badge color="forest">₹{batch.bandPrice}</Badge>
                <div className="ml-auto">
                  <StatusBadge batch={batch} />
                </div>
              </div>

              {/* Mid row */}
              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-3 ${lowMargin ? 'text-[var(--danger)]' : 'text-[var(--text-3)]'}`}>
                <span>Cost {formatCurrencyFull(batch.costPrice ?? 0)}</span>
                <span className="text-[var(--border-strong)]">•</span>
                <span className={`flex items-center gap-0.5 font-semibold ${lowMargin ? 'text-[var(--danger)]' : 'text-[var(--text-2)]'}`}>
                  {lowMargin && <MarginWarning />}
                  Margin {batch.margin ?? 'N/A'}%
                </span>
                <span className="text-[var(--border-strong)]">•</span>
                <span>Age {batch.ageInDays}d</span>
                <span className="text-[var(--border-strong)]">•</span>
                <span>Qty {batch.quantityRemaining}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => onAction(batch.id, 'close')}>
                  Close Batch
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onAction(batch.id, 'adjust')}>
                  Adjust
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onAction(batch.id, 'defective')}>
                  Defective
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="card hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Vendor', 'Band', 'Cost', 'Qty', 'Age', 'Margin', 'Status', 'Actions'].map(h => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="stagger-children">
            {batches.map(batch => {
              const lowMargin = batch.margin != null && batch.margin < 15
              return (
                <tr
                  key={batch.id}
                  className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-raised)]/50 transition-colors last:border-b-0"
                >
                  <td className="px-4 py-3 font-semibold text-[var(--text-1)]">
                    {batch.vendorName ?? '—'}
                    {batch.categoryName && (
                      <div className="text-xs text-[var(--text-3)] font-normal">{batch.categoryName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="forest">₹{batch.bandPrice}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-2)]">
                    {formatCurrencyFull(batch.costPrice ?? 0)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--text-1)]">
                    {batch.quantityRemaining}
                    <span className="text-[var(--text-3)] font-normal text-xs"> / {batch.quantityAdded}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-2)]">
                    {batch.ageInDays}d
                  </td>
                  <td className={`px-4 py-3 font-semibold ${lowMargin ? 'text-[var(--danger)]' : 'text-[var(--text-2)]'}`}>
                    <span className="flex items-center gap-1">
                      {lowMargin && <MarginWarning />}
                      {batch.margin != null ? `${batch.margin}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge batch={batch} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => onAction(batch.id, 'close')}>Close</Button>
                      <Button variant="ghost" size="sm" onClick={() => onAction(batch.id, 'adjust')}>Adjust</Button>
                      <Button variant="secondary" size="sm" onClick={() => onAction(batch.id, 'defective')}>Defective</Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
