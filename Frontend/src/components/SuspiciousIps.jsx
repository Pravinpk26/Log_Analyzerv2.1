export default function SuspiciousIps({ rows }) {
  const hasData = rows && rows.length > 0

  return (
    <div className="card p-5">
      <p className="text-[14px] font-semibold text-ink mb-4">Top Suspicious IPs</p>

      {hasData ? (
        <>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ink-faint">
                  <th className="px-2 pb-2 font-medium">IP Address</th>
                  <th className="px-2 pb-2 font-medium hidden sm:table-cell">Location</th>
                  <th className="px-2 pb-2 font-medium text-right">Events</th>
                  <th className="px-2 pb-2 font-medium text-right">Risk Score</th>
                  <th className="px-2 pb-2 font-medium text-right hidden md:table-cell">Activity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.ip} className="border-t border-panel-border">
                    <td className="px-2 py-2.5 text-[12.5px] font-mono text-ink whitespace-nowrap">{row.ip}</td>
                    <td className="px-2 py-2.5 text-[12px] text-ink-muted hidden sm:table-cell">
                      {row.city && row.city !== 'Unknown' ? `${row.city}, ${row.country}` : row.country}
                    </td>
                    <td className="px-2 py-2.5 text-[12.5px] text-ink text-right">{row.total.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-right">
                      <ScoreBadge score={row.score} />
                    </td>
                    <td className="px-2 py-2.5 hidden md:table-cell">
                      <ActivityBar score={row.score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="w-full mt-4 py-2.5 rounded-lg border border-panel-border text-[12.5px] font-medium text-brand-primary hover:bg-brand-primary/10 transition-colors">
            View All IPs
          </button>
        </>
      ) : (
        <div className="py-10 flex flex-col items-center gap-1 text-center">
          <p className="text-[13px] text-ink-muted">No IP activity yet</p>
          <p className="text-[11.5px] text-ink-faint max-w-[260px]">
            Suspicious IPs will surface here once scans or uploaded logs bring in traffic.
          </p>
        </div>
      )}
    </div>
  )
}

function ScoreBadge({ score }) {
  const cls =
    score >= 80
      ? 'bg-brand-red/15 text-brand-red'
      : score >= 50
      ? 'bg-brand-orange/15 text-brand-orange'
      : 'bg-brand-green/15 text-brand-green'
  return <span className={`tag ${cls}`}>{score}</span>
}

function ActivityBar({ score }) {
  const color = score >= 80 ? '#ef4444' : score >= 50 ? '#f59e0b' : '#22c55e'
  return (
    <div className="w-24 h-1.5 rounded-full bg-panel-border overflow-hidden ml-auto">
      <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
    </div>
  )
}
