import type { VendorWithDues } from '../../types'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatCurrencyFull } from '../../lib/utils'

interface Props {
  vendor: VendorWithDues
  onOrder: (vendorId: number) => void
  onMessage: (vendor: VendorWithDues) => void
}

export default function VendorCard({ vendor, onOrder, onMessage }: Props) {
  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-bold text-[var(--text-1)] text-base leading-tight">{vendor.name}</h3>
        {vendor.city && <Badge color="sand">{vendor.city}</Badge>}
      </div>

      {/* Info rows */}
      <div className="flex flex-col gap-1.5 mb-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-3)]">Lead time</span>
          <span className="text-[var(--text-2)]">
            {vendor.notes?.match(/(\d+-?\d*\s*day)/i)?.[0] ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-3)]">Dues</span>
          <span
            className="font-semibold tabular-nums"
            style={{ color: vendor.dues > 0 ? 'var(--danger)' : 'var(--text-2)' }}
          >
            {vendor.dues > 0 ? formatCurrencyFull(vendor.dues) : 'Clear'}
          </span>
        </div>
      </div>

      {/* Supplied bands */}
      {vendor.suppliedBands.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {vendor.suppliedBands.map((b) => (
            <Badge key={b.bandId} color="forest">
              {b.categoryName} ₹{b.price}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => onOrder(vendor.id)}>
          Order
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onMessage(vendor)}>
          Message
        </Button>
      </div>
    </div>
  )
}
