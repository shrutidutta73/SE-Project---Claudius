import { useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import VendorCard from '../components/procurement/VendorCard'
import OrderBuilder from '../components/procurement/OrderBuilder'
import { MOCK_VENDORS, MOCK_REORDERS, MOCK_SUGGEST_ORDERS } from '../lib/mock'
import type { Reorder, ReorderStatus, VendorWithDues } from '../types'
import { formatDateTime } from '../lib/utils'

const STATUS_BADGE: Record<ReorderStatus, { color: 'sand' | 'amber' | 'sage' | 'forest'; label: string }> = {
  draft:        { color: 'sand',   label: 'Draft' },
  sent:         { color: 'amber',  label: 'Sent' },
  acknowledged: { color: 'sage',   label: 'Acknowledged' },
  fulfilled:    { color: 'forest', label: 'Fulfilled' },
}

export default function ProcurementPage() {
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null)
  const [showOrderBuilder, setShowOrderBuilder] = useState(false)
  const [reorders, setReorders] = useState<Reorder[]>(MOCK_REORDERS)

  // Add vendor modal
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [addVendorName, setAddVendorName] = useState('')
  const [addVendorPhone, setAddVendorPhone] = useState('')
  const [addVendorCity, setAddVendorCity] = useState('')

  const selectedVendor = selectedVendorId !== null
    ? MOCK_VENDORS.find((v) => v.id === selectedVendorId) ?? null
    : null

  const suggestions = selectedVendorId !== null ? (MOCK_SUGGEST_ORDERS[selectedVendorId] ?? []) : []
  const existingReorder = selectedVendorId !== null
    ? reorders.find((r) => r.vendorId === selectedVendorId && r.status !== 'fulfilled') ?? null
    : null

  const handleOrder = (vendorId: number) => {
    setSelectedVendorId(vendorId)
    setShowOrderBuilder(true)
  }

  const handleMessage = (vendor: VendorWithDues) => {
    const phone = vendor.phone?.replace(/\D/g, '') ?? ''
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  const handleSend = (items: { priceBandId: number; finalQty: number }[]) => {
    if (!selectedVendorId || !selectedVendor) return
    setReorders((prev) => {
      const existing = prev.find((r) => r.vendorId === selectedVendorId && r.status === 'draft')
      if (existing) {
        return prev.map((r) =>
          r.id === existing.id ? { ...r, status: 'sent' as ReorderStatus, sentAt: new Date().toISOString() } : r,
        )
      }
      const newReorder: Reorder = {
        id: prev.length + 1,
        storeId: 1,
        vendorId: selectedVendorId,
        vendorName: selectedVendor.name,
        createdBy: 2,
        status: 'sent',
        messageText: null,
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        items: items.map((it, idx) => {
          const s = suggestions.find((sg) => sg.priceBandId === it.priceBandId)!
          return {
            id: idx + 1,
            reorderId: prev.length + 1,
            priceBandId: it.priceBandId,
            categoryName: s.categoryName,
            bandPrice: s.bandPrice,
            suggestedQty: s.suggestedQty,
            finalQty: it.finalQty,
          }
        }),
      }
      return [...prev, newReorder]
    })
    setShowOrderBuilder(false)
  }

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault()
    setShowAddVendor(false)
    setAddVendorName('')
    setAddVendorPhone('')
    setAddVendorCity('')
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Procurement"
        subtitle="Data-driven ordering"
        actions={
          <Button variant="primary" onClick={() => setShowAddVendor(true)}>
            + Add Vendor
          </Button>
        }
      />

      {/* Vendor grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children mb-8">
        {MOCK_VENDORS.map((vendor) => (
          <VendorCard
            key={vendor.id}
            vendor={vendor}
            onOrder={handleOrder}
            onMessage={handleMessage}
          />
        ))}
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-base font-bold text-[var(--text-1)] mb-3">Recent Orders</h2>
        <div className="flex flex-col gap-3">
          {reorders.map((r) => {
            const s = STATUS_BADGE[r.status]
            return (
              <div key={r.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <p className="font-semibold text-[var(--text-1)]">{r.vendorName}</p>
                    <p className="text-xs text-[var(--text-3)] mt-0.5">
                      {r.items.length} item{r.items.length !== 1 ? 's' : ''} •{' '}
                      {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge color={s.color}>{s.label}</Badge>
              </div>
            )
          })}
          {reorders.length === 0 && (
            <p className="text-sm text-[var(--text-3)]">No recent orders.</p>
          )}
        </div>
      </div>

      {/* Order Builder Modal */}
      {selectedVendor && (
        <Modal
          open={showOrderBuilder}
          onClose={() => setShowOrderBuilder(false)}
          title={selectedVendor.name}
        >
          <OrderBuilder
            vendor={selectedVendor}
            suggestions={suggestions}
            reorder={existingReorder}
            onSend={handleSend}
            onClose={() => setShowOrderBuilder(false)}
          />
        </Modal>
      )}

      {/* Add Vendor Modal */}
      <Modal
        open={showAddVendor}
        onClose={() => setShowAddVendor(false)}
        title="Add Vendor"
      >
        <form onSubmit={handleAddVendor} className="flex flex-col gap-4">
          <Input
            label="Vendor Name"
            placeholder="e.g. Krishna Textiles"
            value={addVendorName}
            onChange={(e) => setAddVendorName(e.target.value)}
            required
          />
          <Input
            label="Phone (WhatsApp)"
            placeholder="10-digit mobile"
            type="tel"
            value={addVendorPhone}
            onChange={(e) => setAddVendorPhone(e.target.value)}
          />
          <Input
            label="City"
            placeholder="e.g. Surat"
            value={addVendorCity}
            onChange={(e) => setAddVendorCity(e.target.value)}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" fullWidth onClick={() => setShowAddVendor(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              Add Vendor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
