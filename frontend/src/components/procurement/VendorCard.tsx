import type { VendorWithDues } from '../../types'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatCurrencyFull } from '../../lib/utils'

interface Props {
  vendor: VendorWithDues
  pending?: boolean
  loading?: boolean
  canDelete?: boolean
  onOrder: (vendorId: number) => void
  onMessage: (vendor: VendorWithDues) => void
  onEdit: (vendor: VendorWithDues) => void
  onDelete?: (vendor: VendorWithDues) => void
}

export default function VendorCard({
  vendor, pending, loading, canDelete,
  onOrder, onMessage, onEdit, onDelete,
}: Props) {
  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-bold text-[var(--text-1)] text-base leading-tight">{vendor.name}</h3>
        <div className="flex flex-col items-end gap-1">
          {vendor.city && <Badge color="sand">{vendor.city}</Badge>}
          {pending && <Badge color="amber">Pending order</Badge>}
        </div>
      </div>

      {/* Info rows */}
      <div className="flex flex-col gap-1.5 mb-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-3)]">Phone</span>
          <span className="text-[var(--text-2)] tabular-nums">
            {vendor.phone ?? '—'}
          </span>
        </div>
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
      {vendor.suppliedBands.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {vendor.suppliedBands.map((b) => (
            <Badge key={b.bandId} color="forest">
              {b.categoryName} ₹{b.price}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-[var(--text-3)] mb-4">
          No inventory from this vendor yet — add a batch in Inventory first.
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={loading}
          onClick={() => onOrder(vendor.id)}
        >
          {loading ? 'Loading…' : 'Order'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onMessage(vendor)}>
          Message
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(vendor)}>
          Edit
        </Button>
        {canDelete && onDelete && (
          <Button variant="ghost" size="sm" onClick={() => onDelete(vendor)}>
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}
