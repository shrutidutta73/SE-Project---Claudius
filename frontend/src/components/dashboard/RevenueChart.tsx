import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts'
import type { DailySalesSummary } from '../../types'
import { formatCurrency } from '../../lib/utils'

interface Props {
  summaries: DailySalesSummary[]
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function RevenueChart({ summaries }: Props) {
  // Aggregate total revenue per date
  const revenueByDate: Record<string, number> = {}
  for (const s of summaries) {
    revenueByDate[s.date] = (revenueByDate[s.date] ?? 0) + s.totalRevenue
  }

  const data = Object.entries(revenueByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => {
      const dayLabel = DAY_LABELS[new Date(date).getDay()]
      return { date: dayLabel, revenue }
    })

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-[var(--text-1)] mb-4">Daily Revenue</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--text-3)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: 'var(--text-3)' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(v) => [formatCurrency(v as number), 'Revenue']}
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--success)"
            strokeWidth={2.5}
            dot={(props) => {
              const { cx, cy } = props
              return (
                <Dot
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="var(--primary)"
                  stroke="white"
                  strokeWidth={2}
                />
              )
            }}
            activeDot={{ r: 5, fill: 'var(--primary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
