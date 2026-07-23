import { AlertTriangle, Loader2 } from 'lucide-react'
import UploadBanner from '../components/UploadBanner'
import KpiCards from '../components/KpiCards'
import EventOverviewChart from '../components/EventOverviewChart'
import EventsBySourceChart from '../components/EventsBySourceChart'
import TopCountries from '../components/TopCountries'
import TopAnomalies from '../components/TopAnomalies'
import SuspiciousIps from '../components/SuspiciousIps'
import AIInsights from '../components/AIInsights'
import AuthenticationSignals from '../components/AuthenticationSignals'
import Footer from '../components/Footer'
import { useDerivedData, useTimeRange } from '../hooks/useDerivedData'

export default function DashboardPage() {
  const [range, setRange] = useTimeRange('week')
  const {
    loading,
    error,
    lastFile,
    lastScanTarget,
    uploading,
    totalEvents,
    anomalyCount,
    failedLogins,
    uniqueIps,
    risk,
    sparklines,
    timeSeries,
    eventSourceBreakdown,
    countryStats,
    cityStats,
    anomalyRows,
    ipRows,
    aiInsights,
    lastScan,
  } = useDerivedData(range)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-ink-muted">
        <Loader2 size={18} className="animate-spin" />
        Loading dashboard…
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="card border-brand-red/30 bg-brand-red/5 px-4 py-3 flex items-center gap-2.5">
          <AlertTriangle size={15} className="text-brand-red shrink-0" />
          <p className="text-[12.5px] text-ink-muted">
            <span className="text-brand-red font-medium">Backend error:</span> {error}. Make sure your FastAPI
            server is running (e.g. <code className="text-brand-primary">uvicorn main:app --reload</code>).
          </p>
        </div>
      )}

      <UploadBanner
        lastFile={lastFile}
        lastScanTarget={lastScanTarget}
        uploading={uploading}
        totalEvents={totalEvents}
      />

      <KpiCards
        totalEvents={totalEvents}
        anomalyCount={anomalyCount}
        failedLogins={failedLogins}
        uniqueIps={uniqueIps}
        securityScore={risk.score}
        sparklines={sparklines}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <EventOverviewChart data={timeSeries} range={range} onRangeChange={setRange} />
        <EventsBySourceChart
          data={eventSourceBreakdown}
          total={eventSourceBreakdown.reduce((s, d) => s + d.value, 0)}
          title="Events by Source"
          emptyLabel="Run a scan or upload a file to populate sources"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <TopCountries top={countryStats.top} others={countryStats.others} maxEvents={countryStats.maxEvents} cities={cityStats} />
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
          <TopAnomalies rows={anomalyRows.slice(0, 5)} />
          <SuspiciousIps rows={ipRows} />
          <AuthenticationSignals results={lastScan?.results} />
          <AIInsights aiInsights={aiInsights} anomalyRows={anomalyRows} ipRows={ipRows} limit={2} />
        </div>
      </div>

      <Footer />
    </>
  )
}
