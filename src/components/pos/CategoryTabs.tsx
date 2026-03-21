import type { PriceBandWithStock } from '../../types'

interface Props {
  bands: PriceBandWithStock[]
  activeCategory: number | null
  onChange: (id: number) => void
}

interface CategorySummary { id: number; name: string; totalStock: number }

function buildCategories(bands: PriceBandWithStock[]): CategorySummary[] {
  const map = new Map<number, CategorySummary>()
  for (const band of bands) {
    const existing = map.get(band.categoryId)
    if (existing) {
      existing.totalStock += band.totalStock
    } else {
      map.set(band.categoryId, { id: band.categoryId, name: band.categoryName, totalStock: band.totalStock })
    }
  }
  return Array.from(map.values())
}

export default function CategoryTabs({ bands, activeCategory, onChange }: Props) {
  const categories = buildCategories(bands)

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5 min-w-0 w-full">
      {categories.map(cat => {
        const isActive = cat.id === activeCategory
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-md font-semibold whitespace-nowrap transition-all flex-shrink-0 text-sm"
            style={
              isActive
                ? { background: 'var(--primary)', color: '#fff' }
                : { background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }
            }
          >
            {cat.name}
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded leading-none"
              style={
                isActive
                  ? { background: 'rgba(255,255,255,0.2)', color: '#fff' }
                  : { background: 'var(--surface-raised)', color: 'var(--text-4)' }
              }
            >
              {cat.totalStock}
            </span>
          </button>
        )
      })}
    </div>
  )
}
