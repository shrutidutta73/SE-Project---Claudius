import { useState, useMemo } from 'react'
import type { VendorWithDues, SuggestOrderItem, Reorder, ReorderStatus } from '../../types'
import TabBar from '../ui/TabBar'
import Button from '../ui/Button'

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

  const currentStatus: ReorderStatus = reorder?.status ?? 'draft'

  const setQty = (bandId: number, val: number) => {
    setQtys((prev) => ({ ...prev, [bandId]: Math.max(0, val) }))
  }

  const fillSuggested = () => {
    setQtys(Object.fromEntries(suggestions.map((s) => [s.priceBandId, s.suggestedQty])))
  }

  const messageItems = suggestions.map((s) => ({
    categoryName: s.categoryName,
    bandPrice: s.bandPrice,
    finalQty: qtys[s.priceBandId] ?? 0,
  }))

  const previewMessage = buildMessage(vendor.name, messageItems)

  const handleSendWhatsApp = () => {
    const phone = vendor.phone?.replace(/\D/g, '') ?? ''
    const encoded = encodeURIComponent(previewMessage)
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
    onSend(suggestions.map((s) => ({ priceBandId: s.priceBandId, finalQty: qtys[s.priceBandId] ?? 0 })))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status tab bar */}
      <TabBar
        tabs={STATUS_TABS.map((t) => ({ id: t.id, label: t.label }))}
        active={currentStatus}
        onChange={() => {/* read-only status indicator */}}
      />

      {/* Suggest qty button */}
      <div className="flex justify-end">
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
                <td className="px-2 py-2.5 tabular-nums text-[var(--text-3)]">{s.dailyAvg}/day</td>
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

      {/* Message preview */}
      <div
        className="rounded-xl p-3 text-sm text-[var(--text-2)] border"
        style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)] mb-1">
          Message Preview
        </p>
        <p className="leading-relaxed">{previewMessage}</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-1">
        <Button variant="primary" fullWidth onClick={handleSendWhatsApp}>
          Send to WhatsApp
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={() => console.log('record payment')}>
            Record Payment
          </Button>
          <Button variant="ghost" fullWidth onClick={() => console.log('download outstanding')}>
            Download Outstanding
          </Button>
        </div>
      </div>
    </div>
  )
}
