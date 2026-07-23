import { Info } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

const RANGE_OPTIONS = [
  { value: 'day', label: 'Day (hourly)' },
  { value: 'week', label: 'Week (daily)' },
  { value: 'month', label: 'Month (weekly)' },
  { value: 'year', label: 'Year (monthly)' },
]

export default function EventOverviewChart({ data, range, onRangeChange }) {
  const hasData = data && data.length > 0

  return (
    <div className="card p-5 xl:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <p className="text-[14px] font-semibold text-ink">Event Overview</p>
          <Info size={13} className="text-ink-faint" />
        </div>
        <select
          value={range}
          onChange={(e) => onRangeChange(e.target.value)}
          className="text-[11.5px] text-ink bg-panel-soft px-2.5 py-1.5 rounded-md border border-panel-border focus:outline-none focus:ring-1 focus:ring-brand-primary/60"
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#333333" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#6b6864', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: '#6b6864', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: '#242424',
                border: '1px solid #333333',
                borderRadius: 10,
                fontSize: 12,
              }}
              labelStyle={{ color: '#f1efec' }}
            />
            <Line type="monotone" dataKey="events" name="All Events" stroke="#FF6B35" strokeWidth={2} dot={data.length <= 14} />
            <Line type="monotone" dataKey="failed" name="Failed Logins" stroke="#ef4444" strokeWidth={2} dot={data.length <= 14} />
            <Line
              type="monotone"
              dataKey="anomalies"
              name="Anomalies"
              stroke="#FBBF24"
              strokeWidth={2}
              dot={data.length <= 14}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState />
      )}

      <div className="flex items-center gap-5 mt-2">
        <Legend color="#FF6B35" label="All Events" />
        <Legend color="#ef4444" label="Failed Logins" />
        <Legend color="#FBBF24" label="Anomalies" />
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="text-[11.5px] text-ink-muted">{label}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="h-[260px] flex flex-col items-center justify-center text-center gap-1">
      <p className="text-[13px] text-ink-muted">No events yet</p>
      <p className="text-[11.5px] text-ink-faint max-w-[220px]">
        Run a scan or upload a log file to start plotting activity over time.
      </p>
    </div>
  )
}
