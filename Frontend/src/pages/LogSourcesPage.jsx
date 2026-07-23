import { Radio, CheckCircle2, Clock, Activity, Globe, FileJson } from 'lucide-react'
import { useDerivedData } from '../hooks/useDerivedData'
import EventOverviewChart from '../components/EventOverviewChart'
import { useTimeRange } from '../hooks/useDerivedData'

export default function LogSourcesPage() {
  const [range, setRange] = useTimeRange('week')
  const { events, connected, lastScanTarget, lastScan, sourceCounts, timeSeries, totalEvents } =
    useDerivedData(range)

  const latestEvent = events[events.length - 1]

  const sources = [
    {
      name: 'Live Monitoring',
      icon: Radio,
      status: connected ? 'Healthy' : 'Unreachable',
      healthy: connected,
      lastScan: lastScanTarget || (latestEvent ? latestEvent.timestamp : '—'),
      events: sourceCounts.live,
      detail: lastScanTarget || 'No scan run yet this session',
    },
    {
      name: 'JSON Upload',
      icon: FileJson,
      status: sourceCounts.json > 0 ? 'Active' : 'Idle',
      healthy: true,
      lastScan: sourceCounts.json > 0 ? 'This session' : '—',
      events: sourceCounts.json,
      detail: `${sourceCounts.json} event(s) imported this session`,
    },
    {
      name: 'CSV Upload',
      icon: FileJson,
      status: sourceCounts.csv > 0 ? 'Active' : 'Idle',
      healthy: true,
      lastScan: sourceCounts.csv > 0 ? 'This session' : '—',
      events: sourceCounts.csv,
      detail: `${sourceCounts.csv} event(s) imported this session`,
    },
  ]

  const healthyCount = sources.filter((s) => s.healthy).length

  return (
    <>
      <div>
        <h1 className="text-lg font-bold text-ink">Log Sources</h1>
        <p className="text-[12.5px] text-ink-faint mt-0.5">
          Authentication source management — live scans (Playwright) and offline log imports feed the same event
          store.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Activity} label="Active Sources" value={sources.filter((s) => s.events > 0).length} />
        <Stat icon={CheckCircle2} label="Healthy Sources" value={`${healthyCount}/${sources.length}`} valueClass="text-brand-green" />
        <Stat
          icon={Radio}
          label="Live Monitoring"
          value={connected ? 'Active' : 'Offline'}
          valueClass={connected ? 'text-brand-green' : 'text-brand-red'}
          isText
        />
        <Stat icon={Globe} label="Events (this session)" value={totalEvents} />
      </div>

      <EventOverviewChart data={timeSeries} range={range} onRangeChange={setRange} />

      <div className="card p-5">
        <p className="text-[14px] font-semibold text-ink mb-4">Connected Sources</p>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="px-2 pb-2 font-medium">Source</th>
                <th className="px-2 pb-2 font-medium">Status</th>
                <th className="px-2 pb-2 font-medium hidden sm:table-cell">Last Activity</th>
                <th className="px-2 pb-2 font-medium text-right">Events</th>
                <th className="px-2 pb-2 font-medium hidden md:table-cell">Detail</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.name} className="border-t border-panel-border">
                  <td className="px-2 py-3 text-[12.5px] font-medium text-ink flex items-center gap-2">
                    <s.icon size={14} className="text-brand-primary" />
                    {s.name}
                  </td>
                  <td className="px-2 py-3">
                    <span className={`tag ${s.healthy ? 'bg-brand-green/15 text-brand-green' : 'bg-brand-red/15 text-brand-red'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-[11.5px] text-ink-faint hidden sm:table-cell flex items-center gap-1">
                    <Clock size={11} />
                    {s.lastScan}
                  </td>
                  <td className="px-2 py-3 text-[12.5px] text-ink text-right">{s.events.toLocaleString()}</td>
                  <td className="px-2 py-3 text-[11.5px] text-ink-faint hidden md:table-cell truncate max-w-[280px]">
                    {s.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-[14px] font-semibold text-ink mb-2">Interaction Engine Detail</p>
        {lastScan ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <MiniStat label="Target URL" value={lastScanTarget} />
            <MiniStat label="Browser" value={lastScan?.authentication_event?.browser} />
            <MiniStat label="Response Time" value={`${lastScan?.authentication_event?.response_time ?? '—'} ms`} />
            <MiniStat label="Login Result" value={lastScan?.authentication_event?.status} />
          </div>
        ) : (
          <p className="text-[12px] text-ink-faint font-mono">// TODO: Backend Integration Required</p>
        )}
        {!lastScan && (
          <p className="text-[11.5px] text-ink-faint mt-1">
            Run a live scan to see Playwright interaction details (browser, cookies, redirect chain) here.
          </p>
        )}
      </div>
    </>
  )
}

function Stat({ icon: Icon, label, value, valueClass = 'text-ink', isText }) {
  return (
    <div className="card px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] text-ink-muted">{label}</p>
        <Icon size={14} className="text-ink-faint" />
      </div>
      <p className={`${isText ? 'text-lg' : 'text-2xl'} font-extrabold ${valueClass}`}>
        {isText ? value : Number(value).toLocaleString()}
      </p>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-ink-faint mb-1">{label}</p>
      <p className="text-[12.5px] font-semibold text-ink truncate">{value || '—'}</p>
    </div>
  )
}
