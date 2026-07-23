import { ShieldCheck, Gauge } from 'lucide-react'
import { useDerivedData, useTimeRange } from '../hooks/useDerivedData'
import EventOverviewChart from '../components/EventOverviewChart'
import EventsBySourceChart from '../components/EventsBySourceChart'
import TopAnomalies from '../components/TopAnomalies'
import AIInsights from '../components/AIInsights'
import AuthenticationSignals from '../components/AuthenticationSignals'

export default function ThreatIntelPage() {
  const [range, setRange] = useTimeRange('week')
  const {
    risk,
    lastScan,
    timeSeries,
    anomalyRows,
    severityCounts,
    aiInsights,
    ipRows,
    totalEvents,
    failedLogins,
    successfulLogins,
    anomalyCount,
  } = useDerivedData(range)

  const severityDonut = [
    { name: 'High', value: severityCounts.High },
    { name: 'Medium', value: severityCounts.Medium },
    { name: 'Low', value: severityCounts.Low },
  ].filter((d) => d.value > 0)

  const categories = new Map()
  for (const row of anomalyRows) {
    categories.set(row.type, (categories.get(row.type) || 0) + row.count)
  }
  const categoryList = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])

  return (
    <>
      <div>
        <h1 className="text-lg font-bold text-ink">Threat Intelligence</h1>
        <p className="text-[12.5px] text-ink-faint mt-0.5">
          Overall authentication security posture — reuses the Risk Engine, Signal Collector, and AI Analysis
          Engine.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] text-ink-muted">Security Score</p>
            <Gauge size={14} className="text-brand-primary" />
          </div>
          <p className="text-2xl font-extrabold text-ink">{risk.score}<span className="text-[13px] text-ink-faint">/100</span></p>
          <p className="text-[11px] text-ink-faint mt-0.5">{risk.source}</p>
        </div>
        <div className="card px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] text-ink-muted">Threat Level</p>
            <ShieldCheck size={14} className="text-ink-faint" />
          </div>
          <p
            className={`text-2xl font-extrabold ${
              risk.level === 'High' ? 'text-brand-red' : risk.level === 'Medium' ? 'text-brand-amber' : 'text-brand-green'
            }`}
          >
            {risk.level}
          </p>
        </div>
        <div className="card px-5 py-4">
          <p className="text-[12px] text-ink-muted mb-2">Active Threats</p>
          <p className="text-2xl font-extrabold text-ink">{anomalyCount}</p>
        </div>
        <div className="card px-5 py-4">
          <p className="text-[12px] text-ink-muted mb-2">AI Confidence</p>
          <p className="text-2xl font-extrabold text-ink">{aiInsights?.confidence_score ?? '—'}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <EventOverviewChart data={timeSeries} range={range} onRangeChange={setRange} />
        <EventsBySourceChart data={severityDonut} total={severityDonut.reduce((s, d) => s + d.value, 0)} title="Risk Breakdown" emptyLabel="No anomalies yet" />
      </div>

      <div className="card p-5">
        <p className="text-[14px] font-semibold text-ink mb-4">Threat Categories</p>
        {categoryList.length === 0 ? (
          <p className="text-[12.5px] text-ink-faint text-center py-6">No threat categories detected yet.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {categoryList.map(([name, count]) => {
              const pct = Math.round((count / (anomalyCount || 1)) * 100)
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12.5px] text-ink-muted">{name}</span>
                    <span className="text-[12px] text-ink-faint">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-panel-border overflow-hidden">
                    <div className="h-full bg-brand-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <TopAnomalies rows={anomalyRows} />
        <div className="card p-5">
          <p className="text-[14px] font-semibold text-ink mb-4">Authentication Summary</p>
          <div className="flex flex-col gap-2.5">
            <Row label="Total Sessions" value={totalEvents} />
            <Row label="Successful Logins" value={successfulLogins} valueClass="text-brand-green" />
            <Row label="Failed Logins" value={failedLogins} valueClass="text-brand-amber" />
            <Row label="Suspicious IPs (score ≥ 50)" value={ipRows.filter((r) => r.score >= 50).length} valueClass="text-brand-red" />
          </div>
        </div>
      </div>

      <AuthenticationSignals results={lastScan?.results} />

      <AIInsights aiInsights={aiInsights} anomalyRows={anomalyRows} ipRows={ipRows} limit={10} showViewReport={false} />
    </>
  )
}

function Row({ label, value, valueClass = 'text-ink' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px] text-ink-muted">{label}</span>
      <span className={`text-[12.5px] font-semibold ${valueClass}`}>{(value ?? 0).toLocaleString()}</span>
    </div>
  )
}
