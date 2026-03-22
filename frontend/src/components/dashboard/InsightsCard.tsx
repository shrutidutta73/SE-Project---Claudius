import type { DailySalesSummary } from '../../types'
import { MOCK_BATCHES } from '../../lib/mock'
import { formatCurrencyFull } from '../../lib/utils'

interface Props {
  summaries: DailySalesSummary[]
}

export default function InsightsCard({ summaries }: Props) {
  const revenueByBand: Record<number, { categoryName: string; bandPrice: number; totalRevenue: number }> = {}
  for (const s of summaries) {
    if (!revenueByBand[s.priceBandId]) {
      revenueByBand[s.priceBandId] = { categoryName: s.categoryName, bandPrice: s.bandPrice, totalRevenue: 0 }
    }
    revenueByBand[s.priceBandId].totalRevenue += s.totalRevenue
  }

  const bands = Object.values(revenueByBand)
  const topBand = bands.sort((a, b) => b.totalRevenue - a.totalRevenue)[0]
  const agingCount = MOCK_BATCHES.filter(b => b.ageInDays > 60).length

  const insightText = topBand
    ? `The ₹${topBand.bandPrice} ${topBand.categoryName} band is your top mover with ${formatCurrencyFull(topBand.totalRevenue)}. ${agingCount} batch${agingCount !== 1 ? 'es' : ''} ${agingCount !== 1 ? 'are' : 'is'} aging over 60 days.`
    : 'No sales data available for this period.'

  return (
    <div className="card p-5 border-l-4" style={{ borderLeftColor: 'var(--danger)' }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--danger)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-black text-[var(--text-1)] mb-1">Insights</h3>
          <p className="text-sm text-[var(--text-2)] leading-relaxed">{insightText}</p>
        </div>
      </div>
    </div>
  )
}
