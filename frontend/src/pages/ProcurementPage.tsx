import { useState, useEffect } from 'react'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import VendorCard from '../components/procurement/VendorCard'
import OrderBuilder from '../components/procurement/OrderBuilder'
import { api } from '../lib/api'
import type { Reorder, ReorderStatus, VendorWithDues, SuggestOrderItem } from '../types'
import { formatDateTime, formatCurrencyFull, buildWhatsAppUrl } from '../lib/utils'
import { useAuthStore } from '../store/roleStore'

const STATUS_BADGE: Record<ReorderStatus, { color: 'sand' | 'amber' | 'sage' | 'forest'; label: string }> = {
  draft:        { color: 'sand',   label: 'Draft' },
  sent:         { color: 'amber',  label: 'Sent' },
  acknowledged: { color: 'sage',   label: 'Acknowledged' },
  fulfilled:    { color: 'forest', label: 'Fulfilled' },
}

// Next status in the procurement lifecycle — null = terminal
const NEXT_STATUS: Record<ReorderStatus, ReorderStatus | null> = {
  draft:        'sent',
  sent:         'acknowledged',
  acknowledged: 'fulfilled',
  fulfilled:    null,
}

const NEXT_LABEL: Record<ReorderStatus, string> = {
  draft:        'Mark Sent',
  sent:         'Mark Acknowledged',
  acknowledged: 'Mark Fulfilled',
  fulfilled:    '',
}

interface VendorFormState {
  name: string
  phone: string
  city: string
  notes: string
}

const EMPTY_VENDOR_FORM: VendorFormState = { name: '', phone: '', city: '', notes: '' }

export default function ProcurementPage() {
  const role = useAuthStore(s => s.currentUser?.role ?? 'staff')
  const canDelete = role === 'owner'

  const [vendors, setVendors] = useState<VendorWithDues[]>([])
  const [reorders, setReorders] = useState<Reorder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null)
  const [showOrderBuilder, setShowOrderBuilder] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestOrderItem[]>([])
  const [orderLoadingId, setOrderLoadingId] = useState<number | null>(null)

  // Add/Edit vendor modal
  const [vendorModal, setVendorModal] = useState<'add' | 'edit' | null>(null)
  const [vendorForm, setVendorForm] = useState<VendorFormState>(EMPTY_VENDOR_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [vendorSaveError, setVendorSaveError] = useState<string | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<VendorWithDues | null>(null)

  // Expanded reorder rows
  const [expandedReorderId, setExpandedReorderId] = useState<number | null>(null)

  // Transient toast message (e.g. "Vendor has no phone on file")
  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(current => current === msg ? null : current), 3500)
  }

  useEffect(() => {
    Promise.all([
      api.get<VendorWithDues[]>('/vendors'),
      api.get<Reorder[]>('/reorders'),
    ]).then(([v, r]) => {
      setVendors(v)
      setReorders(r)
    }).catch((err) => {
      setLoadError(err?.message ?? 'Failed to load procurement data')
    }).finally(() => setLoading(false))
  }, [])

  const selectedVendor = selectedVendorId !== null
    ? vendors.find((v) => v.id === selectedVendorId) ?? null
    : null

  const existingReorder = selectedVendorId !== null
    ? reorders.find((r) => r.vendorId === selectedVendorId && r.status !== 'fulfilled') ?? null
    : null

  const vendorHasPending = (vendorId: number) =>
    reorders.some(r => r.vendorId === vendorId && r.status !== 'fulfilled')

  async function handleOrder(vendorId: number) {
    setOrderLoadingId(vendorId)
    setSelectedVendorId(vendorId)
    try {
      const suggs = await api.get<SuggestOrderItem[]>(`/vendors/${vendorId}/suggest-order`)
      setSuggestions(suggs)
    } catch {
      setSuggestions([])
    } finally {
      setOrderLoadingId(null)
      setShowOrderBuilder(true)
    }
  }

  const handleMessage = (vendor: VendorWithDues) => {
    const url = buildWhatsAppUrl(vendor.phone)
    if (!url) {
      showToast(
        vendor.phone
          ? `"${vendor.phone}" doesn't look like a valid number — edit the vendor to fix.`
          : `${vendor.name} has no phone number on file — edit the vendor to add one.`,
      )
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleSend(items: { priceBandId: number; finalQty: number }[]) {
    if (!selectedVendorId || !selectedVendor) return
    const nonZero = items.filter(i => i.finalQty > 0)
    if (nonZero.length === 0) {
      setShowOrderBuilder(false)
      return
    }
    try {
      const reorderItems = nonZero.map(i => {
        const s = suggestions.find(sg => sg.priceBandId === i.priceBandId)!
        return {
          priceBandId: i.priceBandId,
          categoryName: s.categoryName,
          bandPrice: s.bandPrice,
          suggestedQty: s.suggestedQty,
          finalQty: i.finalQty,
        }
      })
      const newReorder = await api.post<Reorder>('/reorders', {
        vendorId: selectedVendorId,
        items: reorderItems,
      })
      setReorders(prev => {
        const idx = prev.findIndex(r => r.vendorId === selectedVendorId && r.status !== 'fulfilled')
        if (idx >= 0) return prev.map((r, i) => i === idx ? newReorder : r)
        return [newReorder, ...prev]
      })
      // Refresh vendor dues — pending reorders count toward dues
      api.get<VendorWithDues[]>('/vendors').then(setVendors).catch(() => {})
    } catch (err) {
      console.error(err)
    }
    setShowOrderBuilder(false)
  }

  // ── Vendor add/edit ─────────────────────────────────────────────────────────

  function openAddVendor() {
    setVendorForm(EMPTY_VENDOR_FORM)
    setVendorSaveError(null)
    setEditingId(null)
    setVendorModal('add')
  }

  function openEditVendor(vendor: VendorWithDues) {
    setVendorForm({
      name:  vendor.name,
      phone: vendor.phone ?? '',
      city:  vendor.city ?? '',
      notes: vendor.notes ?? '',
    })
    setVendorSaveError(null)
    setEditingId(vendor.id)
    setVendorModal('edit')
  }

  function closeVendorModal() {
    setVendorModal(null)
    setEditingId(null)
    setVendorForm(EMPTY_VENDOR_FORM)
    setVendorSaveError(null)
  }

  async function handleSaveVendor(e: React.FormEvent) {
    e.preventDefault()
    setVendorSaveError(null)
    const payload = {
      name:  vendorForm.name.trim(),
      phone: vendorForm.phone.trim() || undefined,
      city:  vendorForm.city.trim()  || undefined,
      notes: vendorForm.notes.trim() || undefined,
    }
    try {
      if (vendorModal === 'edit' && editingId !== null) {
        const updated = await api.patch<VendorWithDues>(`/vendors/${editingId}`, payload)
        setVendors(prev => prev.map(v => v.id === editingId
          ? { ...v, ...updated, suppliedBands: v.suppliedBands, dues: v.dues }
          : v,
        ))
      } else {
        const created = await api.post<VendorWithDues>('/vendors', payload)
        setVendors(prev => [...prev, created])
      }
      closeVendorModal()
    } catch (err) {
      setVendorSaveError(err instanceof Error ? err.message : 'Could not save vendor')
    }
  }

  // ── Vendor delete ──────────────────────────────────────────────────────────

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    try {
      await api.del(`/vendors/${deleteTarget.id}`)
      setVendors(prev => prev.filter(v => v.id !== deleteTarget.id))
    } catch (err) {
      console.error(err)
    }
    setDeleteTarget(null)
  }

  // ── Reorder status transitions ──────────────────────────────────────────────

  async function handleAdvanceStatus(reorder: Reorder) {
    const next = NEXT_STATUS[reorder.status]
    if (!next) return
    try {
      const updated = await api.patch<Reorder>(`/reorders/${reorder.id}/status`, { status: next })
      setReorders(prev => prev.map(r => r.id === reorder.id ? updated : r))
      if (next === 'fulfilled') {
        // Fulfillment clears pending dues; refresh vendors
        api.get<VendorWithDues[]>('/vendors').then(setVendors).catch(() => {})
      }
    } catch (err) {
      console.error(err)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 animate-slide-up card px-4 py-3 text-sm max-w-md"
          role="status"
          style={{ borderColor: 'var(--warning-border)', background: 'var(--warning-bg)', color: 'var(--text-1)' }}
        >
          {toast}
        </div>
      )}
      <PageHeader
        title="Procurement"
        subtitle="Data-driven ordering"
        actions={
          <Button variant="primary" onClick={openAddVendor}>
            + Add Vendor
          </Button>
        }
      />

      {loadError && (
        <div
          className="mb-4 rounded-xl p-3 text-sm border"
          style={{ background: 'var(--danger-bg, #FEF2F2)', borderColor: 'var(--danger, #DC2626)', color: 'var(--danger, #DC2626)' }}
        >
          {loadError}
        </div>
      )}

      {/* Vendor grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children mb-8">
        {loading ? (
          <p className="text-sm text-[var(--text-3)]">Loading vendors...</p>
        ) : vendors.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">
            No vendors yet — click &ldquo;+ Add Vendor&rdquo; to create one.
          </p>
        ) : vendors.map((vendor) => (
          <VendorCard
            key={vendor.id}
            vendor={vendor}
            pending={vendorHasPending(vendor.id)}
            loading={orderLoadingId === vendor.id}
            canDelete={canDelete}
            onOrder={handleOrder}
            onMessage={handleMessage}
            onEdit={openEditVendor}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-base font-bold text-[var(--text-1)] mb-3">Recent Orders</h2>
        <div className="flex flex-col gap-3">
          {reorders.map((r) => {
            const s = STATUS_BADGE[r.status]
            const next = NEXT_STATUS[r.status]
            const total = r.items.reduce((a, it) => a + it.finalQty * it.bandPrice, 0)
            const isExpanded = expandedReorderId === r.id
            return (
              <div key={r.id} className="card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left flex items-center gap-3"
                    onClick={() => setExpandedReorderId(isExpanded ? null : r.id)}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text-1)] truncate">{r.vendorName}</p>
                      <p className="text-xs text-[var(--text-3)] mt-0.5">
                        {r.items.length} item{r.items.length !== 1 ? 's' : ''} •{' '}
                        {formatCurrencyFull(total)} •{' '}
                        {formatDateTime(r.createdAt)}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <Badge color={s.color}>{s.label}</Badge>
                    {next && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAdvanceStatus(r)}
                      >
                        {NEXT_LABEL[r.status]}
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[var(--border)] pt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                          <th className="py-1">Category</th>
                          <th className="py-1">Band</th>
                          <th className="py-1 text-right">Qty</th>
                          <th className="py-1 text-right">Line total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.items.map((it) => (
                          <tr key={it.id} className="border-t border-[var(--border)]">
                            <td className="py-1.5 text-[var(--text-1)]">{it.categoryName}</td>
                            <td className="py-1.5 tabular-nums">₹{it.bandPrice}</td>
                            <td className="py-1.5 tabular-nums text-right">{it.finalQty}</td>
                            <td className="py-1.5 tabular-nums text-right font-medium">
                              {formatCurrencyFull(it.finalQty * it.bandPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
          {reorders.length === 0 && !loading && (
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

      {/* Add / Edit Vendor Modal */}
      <Modal
        open={vendorModal !== null}
        onClose={closeVendorModal}
        title={vendorModal === 'edit' ? 'Edit Vendor' : 'Add Vendor'}
      >
        <form onSubmit={handleSaveVendor} className="flex flex-col gap-4">
          <Input
            label="Vendor Name"
            placeholder="e.g. Krishna Textiles"
            value={vendorForm.name}
            onChange={(e) => setVendorForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Phone (WhatsApp)"
            placeholder="10-digit mobile"
            type="tel"
            value={vendorForm.phone}
            onChange={(e) => setVendorForm(f => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="City"
            placeholder="e.g. Surat"
            value={vendorForm.city}
            onChange={(e) => setVendorForm(f => ({ ...f, city: e.target.value }))}
          />
          <Input
            label="Notes"
            placeholder="e.g. 3-day lead time"
            value={vendorForm.notes}
            onChange={(e) => setVendorForm(f => ({ ...f, notes: e.target.value }))}
          />
          {vendorSaveError && (
            <p className="text-sm" style={{ color: 'var(--danger, #DC2626)' }}>{vendorSaveError}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" fullWidth onClick={closeVendorModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              {vendorModal === 'edit' ? 'Save Changes' : 'Add Vendor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Vendor?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-2)]">
            This will deactivate <span className="font-semibold text-[var(--text-1)]">{deleteTarget?.name}</span>.
            Existing orders and inventory batches from this vendor are kept.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" fullWidth onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="secondary" fullWidth onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
