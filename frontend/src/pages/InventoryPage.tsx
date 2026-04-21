import { useState, useEffect } from 'react'
import type { BatchFilter, InventoryBatchDetail, AddBatchForm } from '../types'
import type { Category, PriceBand, PriceBandWithStock, VendorWithDues, MatrixRow } from '../types'
import { api } from '../lib/api'
import PageHeader from '../components/ui/PageHeader'
import TabBar from '../components/ui/TabBar'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuthStore } from '../store/roleStore'
import FilterPills from '../components/inventory/FilterPills'
import MatrixView from '../components/inventory/MatrixView'
import BatchList from '../components/inventory/BatchList'
import BatchForm from '../components/inventory/BatchForm'
import CategoriesView from '../components/inventory/CategoriesView'

const TABS = [
  { id: 'matrix',     label: 'Matrix View' },
  { id: 'categories', label: 'Categories' },
  { id: 'batches',    label: 'Batch List' },
]

export default function InventoryPage() {
  const role = useAuthStore(s => s.currentUser?.role ?? 'staff')
  const canManageCategories = role === 'owner' || role === 'manager'

  const [tab, setTab] = useState('matrix')
  const [filter, setFilter] = useState<BatchFilter>('all')
  const [showForm, setShowForm] = useState(false)

  // Add category modal
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const [batches, setBatches] = useState<InventoryBatchDetail[]>([])
  const [matrixRows, setMatrixRows] = useState<MatrixRow[]>([])
  const [vendors, setVendors] = useState<VendorWithDues[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [priceBands, setPriceBands] = useState<PriceBand[]>([])
  const [bandsWithStock, setBandsWithStock] = useState<PriceBandWithStock[]>([])
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
      api.get<PriceBandWithStock[]>('/price-bands/with-stock'),
    ]).then(([matrix, vends, cats, bands, bandsStock]) => {
      setMatrixRows(matrix)
      setVendors(vends)
      setCategories(cats)
      setPriceBands(bands)
      setBandsWithStock(bandsStock)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  // Fetch batches when filter changes
  useEffect(() => {
    api.get<InventoryBatchDetail[]>(`/inventory/batches?filter=${filter}`)
      .then(setBatches)
      .catch(console.error)
  }, [filter])

  function applyBatchStockDelta(batchId: number, newQty: number) {
    const prevBatch = batches.find(b => b.id === batchId)
    if (!prevBatch) return
    const delta = newQty - prevBatch.quantityRemaining
    if (delta === 0) return
    setBandsWithStock(prev => prev.map(b =>
      b.id === prevBatch.priceBandId
        ? { ...b, totalStock: Math.max(0, b.totalStock + delta) }
        : b,
    ))
  }

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
      applyBatchStockDelta(id, updated.quantityRemaining)
      setBatches(prev => prev.map(b => b.id === id ? updated : b))
    } catch (err) { console.error(err) }
  }

  async function handleAdjustSave() {
    const newQty = parseInt(adjustQty, 10)
    if (isNaN(newQty) || newQty < 0) return
    try {
      const updated = await api.patch<InventoryBatchDetail>(`/inventory/batches/${adjustId}`, { action: 'adjust', quantity: newQty })
      applyBatchStockDelta(updated.id, updated.quantityRemaining)
      setBatches(prev => prev.map(b => b.id === adjustId ? updated : b))
      setAdjustId(null)
      setAdjustQty('')
    } catch (err) { console.error(err) }
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    const name = categoryName.trim()
    if (!name) return
    setCategorySaving(true)
    setCategoryError(null)
    try {
      const created = await api.post<Category>('/categories', { name })
      setCategories(prev => [...prev, created])
      setCategoryName('')
      setShowCategoryForm(false)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Could not create category')
    } finally {
      setCategorySaving(false)
    }
  }

  async function handleAddPriceBand(categoryId: number, price: number) {
    const created = await api.post<PriceBand>('/price-bands', { categoryId, price })
    setPriceBands(prev => [...prev, created])
    // Newly created bands have no stock yet — seed local copy so the ladder updates immediately
    const categoryName = categories.find(c => c.id === categoryId)?.name ?? ''
    setBandsWithStock(prev => [...prev, { ...created, categoryName, totalStock: 0 }])
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
      // Keep the Categories ladder in sync with the new stock
      setBandsWithStock(prev => prev.map(b =>
        b.id === data.priceBandId
          ? { ...b, totalStock: b.totalStock + data.quantity }
          : b,
      ))
      setShowForm(false)
    } catch (err) { console.error(err) }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventory"
        subtitle="Price-batch stock management"
        actions={
          <div className="flex gap-2">
            {canManageCategories && (
              <Button variant="ghost" onClick={() => setShowCategoryForm(true)}>
                + Category
              </Button>
            )}
            <Button variant="primary" onClick={() => setShowForm(true)}>
              Add Batch
            </Button>
          </div>
        }
      />

      <TabBar tabs={TABS} active={tab} onChange={setTab} className="mb-5" />

      {tab === 'matrix' && (
        loading
          ? <div className="animate-pulse rounded-xl bg-[var(--surface-raised)] h-48" />
          : <MatrixView rows={matrixRows} />
      )}

      {tab === 'categories' && (
        loading
          ? <div className="animate-pulse rounded-xl bg-[var(--surface-raised)] h-64" />
          : (
            <CategoriesView
              categories={categories}
              bandsWithStock={bandsWithStock}
              canManage={canManageCategories}
              onAddCategory={() => setShowCategoryForm(true)}
              onAddBand={handleAddPriceBand}
            />
          )
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

      {/* Add category modal */}
      <Modal
        open={showCategoryForm}
        onClose={() => { setShowCategoryForm(false); setCategoryError(null); setCategoryName('') }}
        title="Add Category"
      >
        <form onSubmit={handleSaveCategory} className="flex flex-col gap-4">
          <Input
            label="Category Name"
            placeholder="e.g. Jackets"
            value={categoryName}
            onChange={e => setCategoryName(e.target.value)}
            required
            autoFocus
          />
          {categoryError && (
            <p className="text-sm" style={{ color: 'var(--danger, #DC2626)' }}>{categoryError}</p>
          )}
          <p className="text-xs text-[var(--text-3)]">
            After creating a category, add price bands for it on the POS or Inventory page before adding batches.
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => { setShowCategoryForm(false); setCategoryError(null); setCategoryName('') }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth disabled={categorySaving || !categoryName.trim()}>
              {categorySaving ? 'Saving…' : 'Create Category'}
            </Button>
          </div>
        </form>
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
