import type { AuditLogEntry } from '../../types'
import Badge from '../ui/Badge'
import { formatDateTime } from '../../lib/utils'

interface Props {
  entries: AuditLogEntry[]
}

export default function AuditLog({ entries }: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <h3 className="font-bold text-sm text-[var(--text-1)]">Audit Log</h3>
        <p className="text-xs text-[var(--text-3)] mt-0.5">History of data pruning events</p>
      </div>

      {entries.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-[var(--text-3)]">No audit entries yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] whitespace-nowrap">
                  Timestamp
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
                  Type
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] whitespace-nowrap">
                  Records Pruned
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`border-b border-[var(--border)]/50 hover:bg-[var(--surface-raised)]/50 transition-colors ${
                    i === entries.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-3 text-xs text-[var(--text-2)] whitespace-nowrap tabular-nums">
                    {formatDateTime(entry.timestamp)}
                  </td>
                  <td className="px-5 py-3">
                    {entry.type === 'auto' ? (
                      <Badge color="sage">AUTO</Badge>
                    ) : (
                      <Badge color="terracotta">MANUAL</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-[var(--text-1)] tabular-nums">
                    {entry.recordsPruned.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
