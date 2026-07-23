import { FileJson, FileSpreadsheet, Printer } from 'lucide-react'
import { useDerivedData, useTimeRange } from '../hooks/useDerivedData'
import EventOverviewChart from '../components/EventOverviewChart'
import EventsBySourceChart from '../components/EventsBySourceChart'
import TopAnomalies from '../components/TopAnomalies'
import TopCountries from '../components/TopCountries'
import AIInsights from '../components/AIInsights'
import { exportEventsAsCsv, exportReportAsJson, exportViaPrint } from '../lib/exportUtils'

export default function ReportsPage() {
  const [range, setRange] = useTimeRange('month')
  const data = useDerivedData(range)
  const {
    events,
    totalEvents,
    failedLogins,
    successfulLogins,
    uniqueIps,
    anomalyCount,
    risk,
    timeSeries,
    browserBreakdown,
    countryStats,
    cityStats,
    anomalyRows,
    aiInsights,
    ipRows,
    severityCounts,
  } = data

  const executiveSummary = buildExecutiveSummary({ totalEvents, failedLogins, successfulLogins, uniqueIps, anomalyCount, risk })

  function handleJsonExport() {
    exportReportAsJson({
      generated_at: new Date().toISOString(),
      executive_summary: executiveSummary,
      statistics: { totalEvents, failedLogins, successfulLogins, uniqueIps, anomalyCount },
      security_score: risk,
      anomalies: anomalyRows,
      suspicious_ips: ipRows,
      top_countries: countryStats.top,
      ai_insights: aiInsights,
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">Reports</h1>
          <p className="text-[12.5px] text-ink-faint mt-0.5">Executive security reporting, generated from live session data.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton icon={Printer} label="PDF" onClick={exportViaPrint} />
          <ExportButton icon={FileSpreadsheet} label="CSV" onClick={() => exportEventsAsCsv(events)} disabled={events.length === 0} />
          <ExportButton icon={FileJson} label="JSON" onClick={handleJsonExport} />
        </div>
      </div>
      <p className="text-[10.5px] text-ink-faint -mt-3 font-mono">
        // PDF export uses the browser's print-to-PDF. A dedicated backend-rendered PDF endpoint is a future
        enhancement — TODO: Backend Integration Required.
      </p>

      <div id="print-report" className="flex flex-col gap-5">
        <div className="card p-5">
          <p className="text-[14px] font-semibold text-ink mb-2">Executive Summary</p>
          <p className="text-[12.5px] text-ink-muted leading-relaxed">{executiveSummary}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Kpi label="Total Sessions" value={totalEvents} />
          <Kpi label="Successful" value={successfulLogins} valueClass="text-brand-green" />
          <Kpi label="Failed" value={failedLogins} valueClass="text-brand-amber" />
          <Kpi label="Anomalies" value={anomalyCount} valueClass="text-brand-red" />
          <Kpi label="Security Score" value={`${risk.score}/100`} valueClass="text-brand-primary" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <EventOverviewChart data={timeSeries} range={range} onRangeChange={setRange} />
          <EventsBySourceChart data={browserBreakdown} total={totalEvents} title="Events by Browser" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
          <TopCountries top={countryStats.top} others={countryStats.others} maxEvents={countryStats.maxEvents} cities={cityStats} />
          <div className="xl:col-span-2 flex flex-col gap-5">
            <TopAnomalies rows={anomalyRows} />
            <EventsBySourceChart
              data={[
                { name: 'High', value: severityCounts.High },
                { name: 'Medium', value: severityCounts.Medium },
                { name: 'Low', value: severityCounts.Low },
              ].filter((d) => d.value > 0)}
              total={anomalyCount}
              title="Risk Distribution"
              emptyLabel="No anomalies recorded yet"
            />
          </div>
        </div>

        <AIInsights aiInsights={aiInsights} anomalyRows={anomalyRows} ipRows={ipRows} limit={10} showViewReport={false} />
      </div>
    </>
  )
}

function buildExecutiveSummary({ totalEvents, failedLogins, successfulLogins, uniqueIps, anomalyCount, risk }) {
  if (totalEvents === 0) {
    return 'No authentication activity has been recorded this session. Run a live scan or upload a log file to generate a meaningful report.'
  }
  const failRate = totalEvents ? Math.round((failedLogins / totalEvents) * 100) : 0
  return (
    `This session recorded ${totalEvents} authentication event${totalEvents === 1 ? '' : 's'} across ${uniqueIps} unique IP address${uniqueIps === 1 ? '' : 'es'}, ` +
    `with ${successfulLogins} successful and ${failedLogins} failed login${failedLogins === 1 ? '' : 's'} (${failRate}% failure rate). ` +
    `${anomalyCount} anomal${anomalyCount === 1 ? 'y was' : 'ies were'} flagged by the rule-based detection engine. ` +
    `The current Security Score is ${risk.score}/100 (${risk.level} risk), based on ${risk.source}.`
  )
}

function ExportButton({ icon: Icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 bg-panel border border-panel-border hover:border-brand-primary/40 text-ink text-[12.5px] font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

function Kpi({ label, value, valueClass = 'text-ink' }) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-[11.5px] text-ink-muted mb-1.5">{label}</p>
      <p className={`text-xl font-extrabold ${valueClass}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  )
}
