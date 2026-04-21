import { useState, useMemo, useEffect } from 'react'
import type { VendorWithDues, SuggestOrderItem, Reorder, ReorderStatus } from '../../types'
import TabBar from '../ui/TabBar'
import Button from '../ui/Button'
import { formatCurrencyFull, buildWhatsAppUrl } from '../../lib/utils'

interface Props {
  vendor: VendorWithDues
  suggestions: SuggestOrderItem[]
  reorder: Reorder | null
  onSend: (items: { priceBandId: number; finalQty: number }[]) => void
  onClose: () => void
}

const STATUS_TABS: { id: ReorderStatus; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'acknowledged', label: 'Acknowledged' },
  { id: 'fulfilled', label: 'Fulfilled' },
]

function buildMessage(vendorName: string, items: { categoryName: string; bandPrice: number; finalQty: number }[]): string {
  const lines = items
    .filter((i) => i.finalQty > 0)
    .map((i) => `${i.finalQty}x ${i.categoryName} ₹${i.bandPrice}`)
    .join(', ')
  return `Hi ${vendorName}, please send: ${lines}. Please confirm.`
}

export default function OrderBuilder({ vendor, suggestions, reorder, onSend, onClose }: Props) {
  const initialQtys = useMemo(
    () => Object.fromEntries(suggestions.map((s) => [s.priceBandId, s.suggestedQty])),
    [suggestions],
  )
  const [qtys, setQtys] = useState<Record<number, number>>(initialQtys)

  // Re-seed qtys when suggestions arrive after an initial render with empty list
  useEffect(() => {
    setQtys(initialQtys)
  }, [initialQtys])

  const currentStatus: ReorderStatus = reorder?.status ?? 'draft'

  const setQty = (bandId: number, val: number) => {
    setQtys((prev) => ({ ...prev, [bandId]: Math.max(0, val) }))
  }

  const fillSuggested = () => {
    setQtys(Object.fromEntries(suggestions.map((s) => [s.priceBandId, s.suggestedQty])))
  }

  const clearAll = () => {
    setQtys(Object.fromEntries(suggestions.map((s) => [s.priceBandId, 0])))
  }

  const messageItems = suggestions.map((s) => ({
    categoryName: s.categoryName,
    bandPrice: s.bandPrice,
    finalQty: qtys[s.priceBandId] ?? 0,
  }))

  const totalQty = messageItems.reduce((a, b) => a + b.finalQty, 0)
  const totalCost = messageItems.reduce((a, b) => a + b.finalQty * b.bandPrice, 0)
  const hasAnyQty = totalQty > 0

  const previewMessage = hasAnyQty ? buildMessage(vendor.name, messageItems) : ''

  const waUrl = buildWhatsAppUrl(vendor.phone, previewMessage)

  const handleSendWhatsApp = () => {
    if (!hasAnyQty) return
    if (waUrl) window.open(waUrl, '_blank', 'noopener,noreferrer')
    onSend(suggestions.map((s) => ({ priceBandId: s.priceBandId, finalQty: qtys[s.priceBandId] ?? 0 })))
  }

  // Empty state — no batches from this vendor yet
  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="rounded-xl p-4 text-sm text-[var(--text-2)] border"
          style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}
        >
          <p className="font-semibold text-[var(--text-1)] mb-1">Nothing to suggest yet</p>
          <p>
            This vendor hasn&apos;t supplied any inventory batches, so we can&apos;t compute a suggested
            order. Add a batch from {vendor.name} in the Inventory page first, then come back here.
          </p>
        </div>
        <Button variant="ghost" fullWidth onClick={onClose}>
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status tab bar */}
      <TabBar
        tabs={STATUS_TABS.map((t) => ({ id: t.id, label: t.label }))}
        active={currentStatus}
        onChange={() => {/* read-only status indicator */}}
      />

      {/* Quick actions */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Clear
        </Button>
        <Button variant="ghost" size="sm" onClick={fillSuggested}>
          Suggest Qty
        </Button>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Category', 'Band', 'Daily Avg', 'Current Stock', 'Suggested', 'Final Qty'].map((h) => (
                <th
                  key={h}
                  className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {suggestions.map((s) => (
              <tr key={s.priceBandId} className="border-b border-[var(--border)] last:border-0">
                <td className="px-2 py-2.5 font-medium text-[var(--text-1)]">{s.categoryName}</td>
                <td className="px-2 py-2.5 tabular-nums">₹{s.bandPrice}</td>
                <td className="px-2 py-2.5 tabular-nums text-[var(--text-3)]">{s.dailyAvg.toFixed(1)}/day</td>
                <td className="px-2 py-2.5 tabular-nums">{s.currentStock}</td>
                <td className="px-2 py-2.5 tabular-nums text-[var(--primary)] font-semibold">{s.suggestedQty}</td>
                <td className="px-2 py-2.5">
                  <input
                    type="number"
                    min={0}
                    value={qtys[s.priceBandId] ?? 0}
                    onChange={(e) => setQty(s.priceBandId, Number(e.target.value))}
                    className="input w-20 text-center py-1.5!"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-3)]">
          {totalQty} item{totalQty === 1 ? '' : 's'}
        </span>
        <span className="font-semibold tabular-nums text-[var(--text-1)]">
          Est. total {formatCurrencyFull(totalCost)}
        </span>
      </div>

      {/* Message preview */}
      {hasAnyQty && (
        <div
          className="rounded-xl p-3 text-sm text-[var(--text-2)] border"
          style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)] mb-1">
            Message Preview
          </p>
          <p className="leading-relaxed">{previewMessage}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-1">
        {hasAnyQty && !waUrl && (
          <p className="text-xs" style={{ color: 'var(--warning)' }}>
            {vendor.phone
              ? `"${vendor.phone}" isn't a valid WhatsApp number — the order will still be saved, but no message will open.`
              : 'No phone on file — the order will be saved, but no WhatsApp message will open. Edit the vendor to add a phone.'}
          </p>
        )}
        <Button
          variant="primary"
          fullWidth
          disabled={!hasAnyQty}
          onClick={handleSendWhatsApp}
        >
          {waUrl ? 'Send to WhatsApp' : 'Save order'}
        </Button>
        <Button variant="ghost" fullWidth onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
