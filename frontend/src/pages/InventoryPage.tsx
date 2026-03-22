import { useState } from 'react'
import type { BatchFilter, InventoryBatchDetail, AddBatchForm } from '../types'
import { MOCK_BATCHES, MOCK_MATRIX_ROWS, MOCK_VENDORS, MOCK_CATEGORIES, MOCK_PRICE_BANDS } from '../lib/mock'
import PageHeader from '../components/ui/PageHeader'
import TabBar from '../components/ui/TabBar'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import FilterPills from '../components/inventory/FilterPills'
import MatrixView from '../components/inventory/MatrixView'
import BatchList from '../components/inventory/BatchList'
import BatchForm from '../components/inventory/BatchForm'

const TABS = [
  { id: 'matrix', label: 'Matrix View' },
  { id: 'batches', label: 'Batch List' },
]

export default function InventoryPage() {
  const [tab, setTab] = useState('matrix')
  const [filter, setFilter] = useState<BatchFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [batches, setBatches] = useState<InventoryBatchDetail[]>(MOCK_BATCHES)

  // Adjust qty modal
  const [adjustId, setAdjustId] = useState<number | null>(null)
  const [adjustQty, setAdjustQty] = useState('')

  const adjustBatch = adjustId !== null ? batches.find(b => b.id === adjustId) : null

  const lowStockCount = batches.filter(b => b.quantityRemaining < 10).length

  const filteredBatches = batches.filter(b => {
    if (filter === 'low_stock')    return b.quantityRemaining < 10
    if (filter === 'aging')        return b.ageInDays > 60
    if (filter === 'new_arrivals') return b.ageInDays <= 7
    return true
  })

  function handleAction(id: number, action: 'close' | 'adjust' | 'defective') {
    if (action === 'close') {
      setBatches(prev =>
        prev.map(b => b.id === id ? { ...b, quantityRemaining: 0, updatedAt: new Date().toISOString() } : b)
      )
      return
    }
    if (action === 'adjust') {
      const batch = batches.find(b => b.id === id)
      if (!batch) return
      setAdjustQty(String(batch.quantityRemaining))
      setAdjustId(id)
      return
    }
    if (action === 'defective') {
      setBatches(prev =>
        prev.map(b => b.id === id
          ? { ...b, notes: (b.notes ? b.notes + ' [DEFECTIVE]' : '[DEFECTIVE]'), updatedAt: new Date().toISOString() }
          : b
        )
      )
    }
  }

  function handleAdjustSave() {
    const newQty = parseInt(adjustQty, 10)
    if (isNaN(newQty) || newQty < 0) return
    setBatches(prev =>
      prev.map(b => b.id === adjustId ? { ...b, quantityRemaining: newQty, updatedAt: new Date().toISOString() } : b)
    )
    setAdjustId(null)
    setAdjustQty('')
  }

  function handleSaveBatch(data: AddBatchForm) {
    const vendor   = MOCK_VENDORS.find(v => v.id === data.vendorId)
    const category = MOCK_CATEGORIES.find(c => c.id === data.categoryId)
    const band     = MOCK_PRICE_BANDS.find(b => b.id === data.priceBandId)
    if (!category || !band) return

    const newBatch: InventoryBatchDetail = {
      id: batches.length + 1,
      storeId: 1,
      priceBandId: data.priceBandId,
      vendorId: data.vendorId,
      vendorName: vendor?.name ?? null,
      categoryName: category.name,
      bandPrice: band.price,
      quantityAdded: data.quantity,
      quantityRemaining: data.quantity,
      costPrice: data.costPrice,
      addedBy: null,
      notes: data.notes ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ageInDays: 0,
      margin: data.costPrice
        ? Math.round(((band.price - data.costPrice) / band.price) * 100)
        : null,
    }

    setBatches(prev => [newBatch, ...prev])
    setShowForm(false)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventory"
        subtitle="Price-batch stock management"
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Add Batch
          </Button>
        }
      />

      <TabBar tabs={TABS} active={tab} onChange={setTab} className="mb-5" />

      {tab === 'matrix' && <MatrixView rows={MOCK_MATRIX_ROWS} />}

      {tab === 'batches' && (
        <div className="flex flex-col gap-4">
          <FilterPills active={filter} onChange={setFilter} lowStockCount={lowStockCount} />
          <BatchList batches={filteredBatches} onAction={handleAction} />
        </div>
      )}

      {/* Add batch modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Inventory Batch">
        <BatchForm
          vendors={MOCK_VENDORS}
          categories={MOCK_CATEGORIES}
          priceBands={MOCK_PRICE_BANDS}
          onSave={handleSaveBatch}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      {/* Adjust quantity modal */}
      <Modal open={adjustId !== null} onClose={() => setAdjustId(null)} title="Adjust Quantity">
        {adjustBatch && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-[var(--surface-raised)] px-4 py-3">
              <p className="text-xs text-[var(--text-3)] font-semibold uppercase tracking-wide mb-0.5">Batch</p>
              <p className="text-sm font-bold text-[var(--text-1)]">{adjustBatch.categoryName} — ₹{adjustBatch.bandPrice}</p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">Current: {adjustBatch.quantityRemaining} units</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                New Quantity
              </label>
              <input
                className="input text-xl font-bold"
                type="number"
                min="0"
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" fullWidth onClick={() => setAdjustId(null)}>Cancel</Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={handleAdjustSave}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
