import type { StaffLeaderboardEntry } from '../../types'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { getInitials, formatCurrencyFull, formatDateTime } from '../../lib/utils'

interface Props {
  entries: StaffLeaderboardEntry[]
  onEdit: (userId: number) => void
  onReset: (userId: number) => void
}

export default function Roster({ entries, onEdit, onReset }: Props) {
  return (
    <>
      {/* Desktop table */}
      <div className="card hidden md:block overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Staff Roster</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Role', 'Status', 'Clock In', 'Revenue Today', 'Actions'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr
                  key={entry.userId}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-raised)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'var(--primary)' }}
                      >
                        {getInitials(entry.name)}
                      </div>
                      <span className="font-medium" style={{ color: 'var(--text-1)' }}>{entry.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={entry.role === 'manager' ? 'primary' : 'neutral'}>
                      {entry.role.charAt(0).toUpperCase() + entry.role.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    {entry.clockedIn ? <Badge color="success">Active</Badge> : <Badge color="neutral">Out</Badge>}
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-3)' }}>
                    {entry.checkInAt ? formatDateTime(entry.checkInAt) : '—'}
                  </td>
                  <td className="px-5 py-3 font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
                    {formatCurrencyFull(entry.revenueToday)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(entry.userId)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => onReset(entry.userId)}>Reset PIN</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {entries.map(entry => (
          <div key={entry.userId} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: 'var(--primary)' }}
                >
                  {getInitials(entry.name)}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{entry.name}</p>
                  <Badge color={entry.role === 'manager' ? 'primary' : 'neutral'} className="text-[10px]">
                    {entry.role.charAt(0).toUpperCase() + entry.role.slice(1)}
                  </Badge>
                </div>
              </div>
              {entry.clockedIn ? <Badge color="success">Active</Badge> : <Badge color="neutral">Out</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--text-4)' }}>
                  Clock In
                </p>
                <p style={{ color: 'var(--text-2)' }}>
                  {entry.checkInAt ? formatDateTime(entry.checkInAt) : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--text-4)' }}>
                  Revenue Today
                </p>
                <p className="font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                  {formatCurrencyFull(entry.revenueToday)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onEdit(entry.userId)}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => onReset(entry.userId)}>Reset PIN</Button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
