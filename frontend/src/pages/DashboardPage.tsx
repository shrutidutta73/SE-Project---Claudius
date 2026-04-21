import { useState, useEffect, useMemo } from 'react'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import InsightsCard from '../components/dashboard/InsightsCard'
import BandChart from '../components/dashboard/BandChart'
import RevenueChart from '../components/dashboard/RevenueChart'
import { api } from '../lib/api'
import { formatCurrencyFull, formatCurrency } from '../lib/utils'
import { useAuthStore, type Role } from '../store/roleStore'
import type { DailySalesSummary } from '../types'

type Range = 'weekly' | 'monthly'

type Summary = {
  totalRevenue: number
  unitsSold: number
  topBand: { priceBandId: number; categoryName: string; bandPrice: number; revenue: number } | null
  agingBatchCount: number
  activeVendors: number
}

const IcRevenue = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
const IcUnits   = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
const IcStar    = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IcVendor  = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>

export default function DashboardPage() {
  const role = (useAuthStore(s => s.currentUser)?.role ?? 'staff') as Role
  const [range, setRange] = useState<Range>('weekly')
  const [data, setData] = useState<DailySalesSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    api.get<DailySalesSummary[]>(`/dashboard/daily-summary?range=${range}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [range])

  useEffect(() => {
    api.get<Summary>('/dashboard/summary')
      .then(setSummary)
      .catch(console.error)
  }, [])

  // CSV export of the loaded daily summary rows. Uses a blob + anchor so it
  // works offline and doesn't require a backend endpoint.
  function handleExport() {
    if (data.length === 0) return
    const header = ['Date', 'Category', 'Band Price', 'Qty Sold', 'Revenue', 'Returns', 'Refunds']
    const rows = data.map(d => [
      d.date,
      d.categoryName,
      d.bandPrice,
      d.totalQtySold,
      d.totalRevenue,
      d.totalReturns ?? 0,
      d.totalRefunds ?? 0,
    ])
    const escape = (v: string | number) => {
      const s = String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [header, ...rows].map(r => r.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `sales-${range}-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const stats = useMemo(() => {
    const totalRevenue = data.reduce((s, d) => s + d.totalRevenue, 0)
    const unitsSold    = data.reduce((s, d) => s + d.totalQtySold, 0)
    const bandRevenue: Record<string, { categoryName: string; bandPrice: number; revenue: number; qty: number }> = {}
    for (const d of data) {
      const key = `${d.priceBandId}`
      if (!bandRevenue[key]) bandRevenue[key] = { categoryName: d.categoryName, bandPrice: d.bandPrice, revenue: 0, qty: 0 }
      bandRevenue[key].revenue += d.totalRevenue
      bandRevenue[key].qty    += d.totalQtySold
    }
    const bandsArr = Object.values(bandRevenue).sort((a, b) => b.revenue - a.revenue)
    return { totalRevenue, unitsSold, topBand: bandsArr[0], bandsArr }
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-3)' }}>
        Loading...
      </div>
    )
  }

  // ── OWNER VIEW: big numbers, no charts, no date range ───────────
  if (role === 'owner') {
    return (
      <div className="animate-fade-in">
        <div className="mb-5">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Sales Overview</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>This week · Sharma Garments</p>
        </div>

        {/* Big revenue card */}
        <div className="card p-6 mb-4 flex flex-col gap-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-3)' }}>Total Revenue</p>
          <p className="text-5xl font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
            {formatCurrencyFull(stats.totalRevenue)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{stats.unitsSold} items sold</p>
        </div>

        {/* Best-selling bands — simple list */}
        <div className="card p-4">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-1)' }}>Best Selling</p>
          <div className="flex flex-col gap-0">
            {stats.bandsArr.slice(0, 5).map((b, i) => {
              const pct = Math.round((b.revenue / stats.totalRevenue) * 100)
              return (
                <div key={i} className="py-3" style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                      {b.categoryName} · ₹{b.bandPrice}
                    </span>
                    <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                      {formatCurrencyFull(b.revenue)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: 'var(--primary)' }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>{b.qty} units · {pct}% of revenue</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── MANAGER VIEW: full analytics ─────────────────────────────────
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {(['weekly', 'monthly'] as Range[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-3 py-1.5 text-xs font-semibold transition-colors capitalize"
                  style={range === r
                    ? { background: 'var(--primary)', color: '#fff' }
                    : { background: 'var(--surface)', color: 'var(--text-3)' }
                  }
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleExport} disabled={data.length === 0}>
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={IcRevenue} label="Total Revenue" value={formatCurrencyFull(stats.totalRevenue)} color="var(--primary)" />
        <StatCard icon={IcUnits}   label="Units Sold"    value={stats.unitsSold}                        color="var(--success)" />
        <StatCard
          icon={IcStar}
          label="Top Band"
          value={stats.topBand ? `${stats.topBand.categoryName} ₹${stats.topBand.bandPrice}` : '—'}
          subtext={stats.topBand ? formatCurrency(stats.topBand.revenue) : undefined}
          color="var(--danger)"
        />
        <StatCard icon={IcVendor} label="Active Vendors" value={summary?.activeVendors ?? 3} color="var(--primary)" />
      </div>

      <div className="mb-5">
        <InsightsCard summaries={data} agingCount={summary?.agingBatchCount ?? 0} />
      </div>

      {/* Mobile: table list */}
      <div className="md:hidden mb-5">
        <div className="card p-4">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-1)' }}>Band Performance</p>
          <div className="flex flex-col">
            {stats.bandsArr.map((b, idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5" style={{ borderBottom: idx < stats.bandsArr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm truncate" style={{ color: 'var(--text-1)' }}>{b.categoryName}</span>
                  <Badge color="primary">₹{b.bandPrice}</Badge>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{formatCurrencyFull(b.revenue)}</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{b.qty} units</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: charts */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        <BandChart summaries={data} />
        <RevenueChart summaries={data} />
      </div>
    </div>
  )
}
