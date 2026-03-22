import type { StaffLeaderboardEntry } from '../../types'
import Badge from '../ui/Badge'
import { getInitials, formatCurrencyFull } from '../../lib/utils'

interface Props {
  entries: StaffLeaderboardEntry[]
}

export default function Leaderboard({ entries }: Props) {
  const sorted = [...entries].sort((a, b) => b.revenueToday - a.revenueToday)
  const maxRevenue = sorted[0]?.revenueToday ?? 1

  return (
    <div className="card p-5">
      <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-1)' }}>Today's Leaderboard</h2>
      <div className="flex flex-col gap-3">
        {sorted.map((entry, idx) => {
          const barPct = maxRevenue > 0 ? (entry.revenueToday / maxRevenue) * 100 : 0
          const roleLabel = entry.role.charAt(0).toUpperCase() + entry.role.slice(1)
          return (
            <div key={entry.userId} className="flex items-center gap-3">
              <span className="w-5 text-sm font-bold tabular-nums text-right flex-shrink-0" style={{ color: 'var(--text-4)' }}>
                {idx + 1}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'var(--primary)' }}
              >
                {getInitials(entry.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                    {entry.name}
                  </span>
                  <Badge color={entry.role === 'manager' ? 'primary' : 'neutral'}>{roleLabel}</Badge>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${barPct}%`, background: 'var(--primary)', minWidth: '8px' }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--primary)' }}>
                {formatCurrencyFull(entry.revenueToday)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
