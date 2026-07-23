import { useMemo, useState } from 'react'
import { Search, ShieldAlert, KeyRound, Globe2, Filter } from 'lucide-react'
import { useDerivedData } from '../hooks/useDerivedData'
import { severityColor } from '../lib/derive'

const SEVERITIES = ['High', 'Medium', 'Low']

export default function AlertsPage() {
  const { alertRows, severityCounts } = useDerivedData()
  const [activeSeverities, setActiveSeverities] = useState(new Set(SEVERITIES))
  const [query, setQuery] = useState('')

  function toggleSeverity(sev) {
    setActiveSeverities((prev) => {
      const next = new Set(prev)
      if (next.has(sev)) next.delete(sev)
      else next.add(sev)
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return alertRows.filter((row) => {
      if (!activeSeverities.has(row.severity)) return false
      if (!q) return true
      return (
        row.type.toLowerCase().includes(q) ||
        row.message.toLowerCase().includes(q) ||
        row.ip.toLowerCase().includes(q) ||
        row.country.toLowerCase().includes(q)
      )
    })
  }, [alertRows, activeSeverities, query])

  const failedLoginAlerts = alertRows.filter((r) => /failure|brute force/i.test(r.type)).length
  const geoAlerts = alertRows.filter((r) => /country/i.test(r.type)).length
  const suspiciousLoginAlerts = alertRows.filter((r) => /multiple ip|slow|performance/i.test(r.type)).length

  return (
    <>
      <div>
        <h1 className="text-lg font-bold text-ink">Alerts</h1>
        <p className="text-[12.5px] text-ink-faint mt-0.5">
          Authentication security alerts, derived from the anomaly log accumulated this session.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <SeverityCard label="High Risk" count={severityCounts.High} color="text-brand-red" />
        <SeverityCard label="Medium Risk" count={severityCounts.Medium} color="text-brand-amber" />
        <SeverityCard label="Low Risk" count={severityCounts.Low} color="text-brand-green" />
        <SeverityCard label="Failed Login" count={failedLoginAlerts} icon={KeyRound} />
        <SeverityCard label="Suspicious Login" count={suspiciousLoginAlerts} icon={ShieldAlert} />
        <SeverityCard label="Geographic" count={geoAlerts} icon={Globe2} />
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by type, IP, country, message…"
              className="w-full bg-panel-soft border border-panel-border rounded-lg pl-9 pr-3 py-2 text-[12.5px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-brand-primary/60"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-ink-faint" />
            {SEVERITIES.map((sev) => {
              const active = activeSeverities.has(sev)
              const c = severityColor(sev)
              return (
                <button
                  key={sev}
                  onClick={() => toggleSeverity(sev)}
                  className={`tag border transition-colors ${
                    active ? `${c.bg} ${c.text} border-transparent` : 'border-panel-border text-ink-faint'
                  }`}
                >
                  {sev}
                </button>
              )
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-[12.5px] text-ink-faint text-center py-10">
            {alertRows.length === 0 ? 'No alerts recorded yet this session.' : 'No alerts match your filters.'}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ink-faint">
                  <th className="px-2 pb-2 font-medium">Severity</th>
                  <th className="px-2 pb-2 font-medium">Type</th>
                  <th className="px-2 pb-2 font-medium hidden md:table-cell">Details</th>
                  <th className="px-2 pb-2 font-medium hidden sm:table-cell">IP / Country</th>
                  <th className="px-2 pb-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const c = severityColor(row.severity)
                  return (
                    <tr key={i} className="border-t border-panel-border">
                      <td className="px-2 py-2.5">
                        <span className={`tag ${c.bg} ${c.text}`}>{row.severity}</span>
                      </td>
                      <td className="px-2 py-2.5 text-[12.5px] font-medium text-ink whitespace-nowrap">{row.type}</td>
                      <td className="px-2 py-2.5 text-[12px] text-ink-muted hidden md:table-cell">{row.message}</td>
                      <td className="px-2 py-2.5 text-[11.5px] text-ink-faint hidden sm:table-cell font-mono">
                        {row.ip} · {row.country}
                      </td>
                      <td className="px-2 py-2.5 text-[11.5px] text-ink-faint text-right whitespace-nowrap">
                        {row.timestamp}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function SeverityCard({ label, count, color = 'text-ink', icon: Icon }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11.5px] text-ink-muted">{label}</p>
        {Icon && <Icon size={13} className="text-ink-faint" />}
      </div>
      <p className={`text-xl font-extrabold ${color}`}>{count}</p>
    </div>
  )
}
