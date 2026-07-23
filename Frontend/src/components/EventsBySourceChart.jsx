import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

const PALETTE = ['#FF6B35', '#4C8DFF', '#22c55e', '#B27CFF', '#38bdf8', '#ef4444']

// Generic donut used both for "Events by Source" (Live Monitoring / JSON
// Upload / CSV Upload) on the Dashboard and "Events by Browser" on Reports
// — same component, reused rather than duplicated, per a `title` prop.
export default function EventsBySourceChart({ data, total, title = 'Events by Source', emptyLabel = 'No data yet' }) {
  const hasData = data && data.length > 0

  return (
    <div className="card p-5">
      <p className="text-[14px] font-semibold text-ink mb-4">{title}</p>

      {hasData ? (
        <div className="flex items-center gap-4">
          <div className="relative w-[140px] h-[140px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={44}
                  outerRadius={64}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((entry, i) => (
                    <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-lg font-extrabold text-ink leading-none">{formatTotal(total)}</p>
              <p className="text-[10px] text-ink-faint mt-1">Total</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2.5 min-w-0">
            {data.slice(0, 6).map((entry, i) => {
              const pct = total ? Math.round((entry.value / total) * 100) : 0
              return (
                <div key={entry.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="text-[12px] text-ink-muted truncate">{entry.name}</span>
                  </div>
                  <span className="text-[12px] font-semibold text-ink shrink-0">
                    {pct}% · {entry.value.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="h-[140px] flex items-center justify-center text-[12.5px] text-ink-faint">{emptyLabel}</div>
      )}
    </div>
  )
}

function formatTotal(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n || 0}`
}
