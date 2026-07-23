import { FileUp, CheckCircle2, Loader2 } from 'lucide-react'

export default function UploadBanner({ lastFile, lastScanTarget, uploading, totalEvents }) {
  const label = lastFile?.name || lastScanTarget || 'No source loaded yet'
  const statusText = uploading
    ? 'Uploading…'
    : lastFile
    ? `${lastFile.events_imported ?? 0} events imported`
    : lastScanTarget
    ? 'Live scan completed'
    : 'Run a scan or upload a log file to get started'

  return (
    <div className="card flex flex-wrap items-center gap-6 px-5 py-4">
      <div className="flex items-center gap-3 min-w-[220px]">
        <div className="w-10 h-10 rounded-lg bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center shrink-0">
          {uploading ? (
            <Loader2 size={17} className="text-brand-primary animate-spin" />
          ) : (
            <FileUp size={17} className="text-brand-primary" />
          )}
        </div>
        <div>
          <p className="text-[13.5px] font-semibold text-ink truncate max-w-[240px]">{label}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {!uploading && (lastFile || lastScanTarget) && (
              <CheckCircle2 size={12} className="text-brand-green" />
            )}
            <p className="text-[11.5px] text-ink-muted">{statusText}</p>
          </div>
        </div>
      </div>

      <Divider />
      <Stat label="Total Events" value={totalEvents.toLocaleString()} />
      <Divider />
      <Stat label="Log Sources" value="Live Scan + File Upload" />
      <Divider />
      <Stat label="Status" value="Connected" valueClass="text-brand-green" />
    </div>
  )
}

function Divider() {
  return <div className="hidden sm:block w-px h-9 bg-panel-border" />
}

function Stat({ label, value, valueClass = 'text-ink' }) {
  return (
    <div>
      <p className="text-[11px] text-ink-faint mb-0.5">{label}</p>
      <p className={`text-[13.5px] font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}
