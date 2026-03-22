import { useState } from 'react'
import type { VendorWithDues, Category, PriceBand, AddBatchForm } from '../../types'
import { AddBatchFormSchema } from '../../types'
import { calcMargin } from '../../lib/utils'
import Input from '../ui/Input'
import Button from '../ui/Button'

interface Props {
  vendors: VendorWithDues[]
  categories: Category[]
  priceBands: PriceBand[]
  onSave: (data: AddBatchForm) => void
  onCancel: () => void
}

interface FormState {
  vendorId: string
  categoryId: string
  priceBandId: string
  costPrice: string
  quantity: string
  notes: string
}

interface FormErrors {
  vendorId?: string
  categoryId?: string
  priceBandId?: string
  costPrice?: string
  quantity?: string
}

export default function BatchForm({ vendors, categories, priceBands, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormState>({
    vendorId: '',
    categoryId: '',
    priceBandId: '',
    costPrice: '',
    quantity: '',
    notes: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  function set(key: keyof FormState, value: string) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      // Reset price band when category changes
      if (key === 'categoryId') next.priceBandId = ''
      return next
    })
    setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const selectedCategoryId = form.categoryId ? Number(form.categoryId) : null
  const filteredBands = selectedCategoryId
    ? priceBands.filter(b => b.categoryId === selectedCategoryId && b.isActive)
    : []

  const selectedBand = form.priceBandId
    ? priceBands.find(b => b.id === Number(form.priceBandId))
    : null

  const costNum = form.costPrice ? parseFloat(form.costPrice) : null
  const margin = selectedBand && costNum ? calcMargin(costNum, selectedBand.price) : null
  const lowMarginWarning = margin != null && margin < 15

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const raw = {
      vendorId:    form.vendorId    ? Number(form.vendorId)    : undefined,
      categoryId:  form.categoryId  ? Number(form.categoryId)  : undefined,
      priceBandId: form.priceBandId ? Number(form.priceBandId) : undefined,
      costPrice:   form.costPrice   ? parseFloat(form.costPrice) : undefined,
      quantity:    form.quantity    ? parseInt(form.quantity, 10) : undefined,
      notes:       form.notes || undefined,
    }

    const result = AddBatchFormSchema.safeParse(raw)
    if (!result.success) {
      const errs: FormErrors = {}
      result.error.errors.forEach(e => {
        const field = e.path[0] as keyof FormErrors
        errs[field] = e.message
      })
      setErrors(errs)
      return
    }

    onSave(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Vendor */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
          Vendor
        </label>
        <select
          className={`input ${errors.vendorId ? 'border-[var(--danger)]' : ''}`}
          value={form.vendorId}
          onChange={e => set('vendorId', e.target.value)}
        >
          <option value="">Select vendor…</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>{v.name} {v.city ? `(${v.city})` : ''}</option>
          ))}
        </select>
        {errors.vendorId && <p className="text-xs text-[var(--danger)]">{errors.vendorId}</p>}
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
          Category
        </label>
        <select
          className={`input ${errors.categoryId ? 'border-[var(--danger)]' : ''}`}
          value={form.categoryId}
          onChange={e => set('categoryId', e.target.value)}
        >
          <option value="">Select category…</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.categoryId && <p className="text-xs text-[var(--danger)]">{errors.categoryId}</p>}
      </div>

      {/* Price Band */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
          Price Band
        </label>
        <select
          className={`input ${errors.priceBandId ? 'border-[var(--danger)]' : ''}`}
          value={form.priceBandId}
          onChange={e => set('priceBandId', e.target.value)}
          disabled={!selectedCategoryId}
        >
          <option value="">{selectedCategoryId ? 'Select price band…' : 'Choose a category first'}</option>
          {filteredBands.map(b => (
            <option key={b.id} value={b.id}>₹{b.price}</option>
          ))}
        </select>
        {errors.priceBandId && <p className="text-xs text-[var(--danger)]">{errors.priceBandId}</p>}
      </div>

      {/* Cost Price + Quantity row */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Cost Price (₹)"
          type="number"
          min="1"
          step="0.01"
          placeholder="e.g. 380"
          value={form.costPrice}
          onChange={e => set('costPrice', e.target.value)}
          error={errors.costPrice}
        />
        <Input
          label="Quantity"
          type="number"
          min="1"
          step="1"
          placeholder="e.g. 50"
          value={form.quantity}
          onChange={e => set('quantity', e.target.value)}
          error={errors.quantity}
        />
      </div>

      {/* Notes */}
      <Input
        label="Notes (optional)"
        placeholder="e.g. Banarasi collection"
        value={form.notes}
        onChange={e => set('notes', e.target.value)}
      />

      {/* Margin warning */}
      {lowMarginWarning && (
        <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-[var(--danger)]/8 border border-[var(--danger)]/25 animate-fade-in">
          <svg className="shrink-0 mt-0.5 text-[var(--danger)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-xs text-[var(--danger)] font-medium leading-relaxed">
            Margin is only <strong>{margin}%</strong> — below the recommended 15% threshold.
            Consider renegotiating the cost price with the vendor.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" type="button" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button variant="primary" type="submit" className="flex-1">
          Save Batch
        </Button>
      </div>
    </form>
  )
}
