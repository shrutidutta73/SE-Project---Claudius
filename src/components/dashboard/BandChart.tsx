import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { DailySalesSummary } from '../../types'
import { formatCurrency } from '../../lib/utils'

interface Props {
  summaries: DailySalesSummary[]
}

export default function BandChart({ summaries }: Props) {
  // Aggregate revenue by band
  const revenueMap: Record<string, number> = {}
  for (const s of summaries) {
    const key = `${s.categoryName} ₹${s.bandPrice}`
    revenueMap[key] = (revenueMap[key] ?? 0) + s.totalRevenue
  }

  const data = Object.entries(revenueMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-[var(--text-1)] mb-4">Band Performance</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: 'var(--text-3)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={100}
            tick={{ fontSize: 11, fill: 'var(--text-2)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => [formatCurrency(v as number), 'Revenue']}
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {data.map((_, idx) => (
              <Cell key={idx} fill="var(--primary)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
