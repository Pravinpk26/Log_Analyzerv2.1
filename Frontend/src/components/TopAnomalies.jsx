import { severityColor } from '../lib/derive'

export default function TopAnomalies({ rows }) {
  const hasData = rows && rows.length > 0

  return (
    <div className="card p-5">
      <p className="text-[14px] font-semibold text-ink mb-4">Top Anomalies Detected</p>

      {hasData ? (
        <>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ink-faint">
                  <th className="px-2 pb-2 font-medium">Type</th>
                  <th className="px-2 pb-2 font-medium hidden md:table-cell">Description</th>
                  <th className="px-2 pb-2 font-medium text-right">Count</th>
                  <th className="px-2 pb-2 font-medium text-right">Risk Level</th>
                  <th className="px-2 pb-2 font-medium text-right hidden sm:table-cell">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const c = severityColor(row.severity)
                  return (
                    <tr key={row.type} className="border-t border-panel-border">
                      <td className="px-2 py-2.5 text-[12.5px] font-medium text-ink whitespace-nowrap">
                        {row.type}
                      </td>
                      <td className="px-2 py-2.5 text-[12px] text-ink-muted hidden md:table-cell">
                        {row.message}
                      </td>
                      <td className="px-2 py-2.5 text-[12.5px] text-ink text-right">{row.count}</td>
                      <td className="px-2 py-2.5 text-right">
                        <span className={`tag ${c.bg} ${c.text}`}>{row.severity}</span>
                      </td>
                      <td className="px-2 py-2.5 text-[11.5px] text-ink-faint text-right hidden sm:table-cell">
                        {row.lastSeen}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button className="w-full mt-4 py-2.5 rounded-lg border border-panel-border text-[12.5px] font-medium text-brand-primary hover:bg-brand-primary/10 transition-colors">
            View All Alerts
          </button>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="py-10 flex flex-col items-center gap-1 text-center">
      <p className="text-[13px] text-ink-muted">No anomalies detected yet</p>
      <p className="text-[11.5px] text-ink-faint max-w-[260px]">
        Run a scan against a login page and anomalies will populate here as they're found.
      </p>
    </div>
  )
}
