import { useState, useEffect } from 'react'
import type { BatchFilter, InventoryBatchDetail, AddBatchForm } from '../types'
import type { Category, PriceBand, VendorWithDues, MatrixRow } from '../types'
import { api } from '../lib/api'
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

  const [batches, setBatches] = useState<InventoryBatchDetail[]>([])
  const [matrixRows, setMatrixRows] = useState<MatrixRow[]>([])
  const [vendors, setVendors] = useState<VendorWithDues[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [priceBands, setPriceBands] = useState<PriceBand[]>([])
  const [loading, setLoading] = useState(true)

  // Adjust qty modal
  const [adjustId, setAdjustId] = useState<number | null>(null)
  const [adjustQty, setAdjustQty] = useState('')

  const adjustBatch = adjustId !== null ? batches.find(b => b.id === adjustId) : null

  const lowStockCount = batches.filter(b => b.quantityRemaining < 10).length

  const filteredBatches = batches

  // Fetch static data on mount
  useEffect(() => {
    Promise.all([
      api.get<MatrixRow[]>('/inventory/matrix'),
      api.get<VendorWithDues[]>('/vendors'),
      api.get<Category[]>('/categories'),
      api.get<PriceBand[]>('/price-bands'),
    ]).then(([matrix, vends, cats, bands]) => {
      setMatrixRows(matrix)
      setVendors(vends)
      setCategories(cats)
      setPriceBands(bands)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  // Fetch batches when filter changes
  useEffect(() => {
    api.get<InventoryBatchDetail[]>(`/inventory/batches?filter=${filter}`)
      .then(setBatches)
      .catch(console.error)
  }, [filter])

  async function handleAction(id: number, action: 'close' | 'adjust' | 'defective') {
    if (action === 'adjust') {
      const batch = batches.find(b => b.id === id)
      if (!batch) return
      setAdjustQty(String(batch.quantityRemaining))
      setAdjustId(id)
      return
    }
    try {
      const updated = await api.patch<InventoryBatchDetail>(`/inventory/batches/${id}`, { action })
      setBatches(prev => prev.map(b => b.id === id ? updated : b))
    } catch (err) { console.error(err) }
  }

  async function handleAdjustSave() {
    const newQty = parseInt(adjustQty, 10)
    if (isNaN(newQty) || newQty < 0) return
    try {
      const updated = await api.patch<InventoryBatchDetail>(`/inventory/batches/${adjustId}`, { action: 'adjust', quantity: newQty })
      setBatches(prev => prev.map(b => b.id === adjustId ? updated : b))
      setAdjustId(null)
      setAdjustQty('')
    } catch (err) { console.error(err) }
  }

  async function handleSaveBatch(data: AddBatchForm) {
    try {
      const newBatch = await api.post<InventoryBatchDetail>('/inventory/batches', {
        priceBandId: data.priceBandId,
        vendorId: data.vendorId,
        quantityAdded: data.quantity,
        costPrice: data.costPrice,
        notes: data.notes,
      })
      setBatches(prev => [newBatch, ...prev])
      setShowForm(false)
    } catch (err) { console.error(err) }
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

      {tab === 'matrix' && (
        loading
          ? <div className="animate-pulse rounded-xl bg-[var(--surface-raised)] h-48" />
          : <MatrixView rows={matrixRows} />
      )}

      {tab === 'batches' && (
        <div className="flex flex-col gap-4">
          <FilterPills active={filter} onChange={setFilter} lowStockCount={lowStockCount} />
          <BatchList batches={filteredBatches} onAction={handleAction} />
        </div>
      )}

      {/* Add batch modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Inventory Batch">
        <BatchForm
          vendors={vendors}
          categories={categories}
          priceBands={priceBands}
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
