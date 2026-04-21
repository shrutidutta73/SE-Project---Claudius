import { useMemo, useState } from 'react'
import type { Category, PriceBandWithStock } from '../../types'
import Badge from '../ui/Badge'

interface Props {
  categories: Category[]
  bandsWithStock: PriceBandWithStock[]
  canManage: boolean
  onAddCategory: () => void
  onAddBand: (categoryId: number, price: number) => Promise<void>
}

type Tone = 'success' | 'warning' | 'danger'

function stockTone(qty: number): Tone {
  if (qty === 0) return 'danger'
  if (qty <= 10) return 'warning'
  return 'success'
}

function toneToVar(t: Tone): string {
  return t === 'success' ? 'var(--success)' : t === 'warning' ? 'var(--warning)' : 'var(--danger)'
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CategoriesView({
  categories, bandsWithStock, canManage, onAddCategory, onAddBand,
}: Props) {
  const bandsByCat = useMemo(() => {
    const m = new Map<number, PriceBandWithStock[]>()
    for (const b of bandsWithStock) {
      if (!m.has(b.categoryId)) m.set(b.categoryId, [])
      m.get(b.categoryId)!.push(b)
    }
    for (const bs of m.values()) bs.sort((a, b) => a.price - b.price)
    return m
  }, [bandsWithStock])

  if (categories.length === 0) {
    return (
      <div className="card p-12 text-center flex flex-col items-center gap-4 animate-fade-in">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </div>
        <div className="max-w-sm">
          <h3 className="text-xl font-extrabold text-[var(--text-1)] tracking-tight mb-1.5">
            No categories yet
          </h3>
          <p className="text-sm text-[var(--text-3)] leading-relaxed">
            Categories are the top of your catalog hierarchy — Shirts, Sarees, Trousers.
            Each one holds its own set of price bands.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={onAddCategory}
            className="btn btn-primary mt-2"
          >
            Create your first category
          </button>
        )}
      </div>
    )
  }

  // Totals across all categories — for a subtle summary strip
  const totalUnits = bandsWithStock.reduce((a, b) => a + b.totalStock, 0)
  const totalLow   = bandsWithStock.filter(b => b.totalStock > 0 && b.totalStock <= 10).length
  const totalOut   = bandsWithStock.filter(b => b.totalStock === 0).length

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Summary strip */}
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 rounded-xl text-sm"
        style={{ background: 'var(--surface-raised)' }}
      >
        <span className="text-[var(--text-3)]">
          <span className="font-bold text-[var(--text-1)] tabular-nums">{categories.length}</span> {categories.length === 1 ? 'category' : 'categories'}
        </span>
        <span className="text-[var(--text-3)]">
          <span className="font-bold text-[var(--text-1)] tabular-nums">{bandsWithStock.length}</span> price {bandsWithStock.length === 1 ? 'band' : 'bands'}
        </span>
        <span className="text-[var(--text-3)]">
          <span className="font-bold text-[var(--text-1)] tabular-nums">{totalUnits.toLocaleString('en-IN')}</span> units in stock
        </span>
        {totalLow > 0 && (
          <span style={{ color: 'var(--warning)' }} className="font-semibold">
            {totalLow} low
          </span>
        )}
        {totalOut > 0 && (
          <span style={{ color: 'var(--danger)' }} className="font-semibold">
            {totalOut} out
          </span>
        )}
        {canManage && (
          <button
            type="button"
            onClick={onAddCategory}
            className="ml-auto text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
          >
            + New category
          </button>
        )}
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
        {categories.map(cat => (
          <CategoryCard
            key={cat.id}
            category={cat}
            bands={bandsByCat.get(cat.id) ?? []}
            canManage={canManage}
            onAddBand={onAddBand}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CategoryCard
// ─────────────────────────────────────────────────────────────

interface CardProps {
  category: Category
  bands: PriceBandWithStock[]
  canManage: boolean
  onAddBand: (categoryId: number, price: number) => Promise<void>
}

function CategoryCard({ category, bands, canManage, onAddBand }: CardProps) {
  const [addingOpen, setAddingOpen] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const totalUnits = bands.reduce((a, b) => a + b.totalStock, 0)
  const lowCount = bands.filter(b => b.totalStock > 0 && b.totalStock <= 10).length
  const outCount = bands.filter(b => b.totalStock === 0).length
  const maxStock = bands.reduce((m, b) => Math.max(m, b.totalStock), 0)

  const categoryInitials = category.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0])
    .join('')
    .toUpperCase()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const p = parseFloat(newPrice)
    if (!isFinite(p) || p <= 0) { setErr('Enter a valid price'); return }
    if (bands.some(b => b.price === p)) { setErr(`₹${p} already exists in this category`); return }
    setSaving(true)
    setErr(null)
    try {
      await onAddBand(category.id, p)
      setNewPrice('')
      setAddingOpen(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  function cancelAdd() {
    setAddingOpen(false)
    setNewPrice('')
    setErr(null)
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-extrabold tracking-tight text-[var(--text-1)] leading-tight truncate">
            {category.name}
          </h3>
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-4)] font-semibold mt-1">
            Created · {formatCreatedAt(category.createdAt)}
          </p>
        </div>
        <div
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-xs tracking-wider"
          style={{
            background: 'var(--primary-bg)',
            color: 'var(--primary)',
            border: '1px solid var(--primary-border)',
          }}
        >
          {categoryInitials || '—'}
        </div>
      </div>

      {/* Stats line */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge color="neutral">{bands.length} {bands.length === 1 ? 'band' : 'bands'}</Badge>
        <Badge color={totalUnits === 0 ? 'danger' : 'primary'}>
          {totalUnits.toLocaleString('en-IN')} units
        </Badge>
        {lowCount > 0 && <Badge color="amber">{lowCount} low</Badge>}
        {outCount > 0 && <Badge color="danger">{outCount} out</Badge>}
      </div>

      {/* Band ladder */}
      {bands.length === 0 ? (
        <div
          className="rounded-xl p-5 text-center"
          style={{
            border: '1px dashed var(--border-strong)',
            background: 'var(--surface-raised)',
          }}
        >
          <p className="text-sm font-semibold text-[var(--text-2)] mb-0.5">No price bands yet</p>
          <p className="text-xs text-[var(--text-3)]">
            {canManage ? 'Add one below to start tracking stock at this price point.' : 'Ask an owner or manager to add price bands.'}
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {bands.map((band, i) => {
            const tone = stockTone(band.totalStock)
            const color = toneToVar(tone)
            const fillPct = maxStock > 0 ? Math.max(4, (band.totalStock / maxStock) * 100) : 0
            return (
              <div
                key={band.id}
                className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-[var(--surface-raised)]/60"
                style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}
              >
                {/* Health indicator */}
                <span
                  className="w-1 h-7 rounded-full shrink-0"
                  style={{ background: color }}
                  aria-hidden
                />
                {/* Price */}
                <span className="tabular-nums font-semibold text-[var(--text-1)] w-16 shrink-0">
                  ₹{band.price.toLocaleString('en-IN')}
                </span>
                {/* Capacity bar */}
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--surface-raised)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${band.totalStock === 0 ? 0 : fillPct}%`,
                      background: color,
                      transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1)',
                    }}
                  />
                </div>
                {/* Qty */}
                <span
                  className="tabular-nums text-xs font-bold w-20 text-right shrink-0"
                  style={{ color }}
                >
                  {band.totalStock === 0
                    ? 'out'
                    : `${band.totalStock.toLocaleString('en-IN')} ${band.totalStock === 1 ? 'unit' : 'units'}`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Inline add band */}
      {canManage && (
        addingOpen ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 animate-slide-up">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
                  style={{ color: 'var(--text-3)' }}
                >
                  ₹
                </span>
                <input
                  autoFocus
                  type="number"
                  min="1"
                  step="1"
                  placeholder="New band price"
                  value={newPrice}
                  onChange={e => { setNewPrice(e.target.value); setErr(null) }}
                  className="input pl-7"
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={cancelAdd}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !newPrice.trim()}
              >
                {saving ? 'Saving…' : 'Add band'}
              </button>
            </div>
            {err && (
              <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{err}</p>
            )}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAddingOpen(true)}
            className="group flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              border: '1px dashed var(--border-strong)',
              color: 'var(--text-3)',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--primary)'
              e.currentTarget.style.color = 'var(--primary)'
              e.currentTarget.style.background = 'var(--primary-bg)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-strong)'
              e.currentTarget.style.color = 'var(--text-3)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <span className="text-base leading-none">+</span>
            Add price band
          </button>
        )
      )}
    </div>
  )
}
