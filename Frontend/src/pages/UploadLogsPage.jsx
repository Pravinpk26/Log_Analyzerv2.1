import { useEffect, useRef, useState } from 'react'
import {
  UploadCloud,
  FileJson,
  FileSpreadsheet,
  FileWarning,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
} from 'lucide-react'
import { useDerivedData } from '../hooks/useDerivedData'
import EventsBySourceChart from '../components/EventsBySourceChart'

const HISTORY_KEY = 'log_analyzer_upload_history'
const ACCEPTED = ['.json', '.csv']

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 25)))
  } catch {
    // ignore
  }
}

function isAccepted(file) {
  const lower = file.name.toLowerCase()
  return ACCEPTED.some((ext) => lower.endsWith(ext))
}

export default function UploadLogsPage() {
  const { runUpload, uploading, scanning, totalEvents, failedLogins, successfulLogins, uniqueIps } =
    useDerivedData()
  const [history, setHistory] = useState(loadHistory)
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [validationError, setValidationError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => saveHistory(history), [history])

  const successCount = history.filter((h) => h.status === 'success').length
  const errorCount = history.filter((h) => h.status === 'error').length

  async function handleFiles(fileList) {
    const file = fileList?.[0]
    if (!file) return
    setValidationError('')
    setSelectedFile(file)

    if (!isAccepted(file)) {
      setValidationError(`"${file.name}" isn't a supported format. Only .json and .csv are accepted.`)
      return
    }
    if (scanning) {
      setValidationError('A live scan is currently running — wait for it to finish before uploading.')
      return
    }

    setProgress(0)
    const entry = {
      id: `${Date.now()}`,
      name: file.name,
      size: file.size,
      kind: file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv',
      timestamp: new Date().toLocaleString(),
    }

    try {
      const data = await runUpload(file, setProgress)
      setHistory((prev) => [
        { ...entry, status: 'success', eventsImported: data.events_imported, message: data.message },
        ...prev,
      ])
    } catch (err) {
      setHistory((prev) => [{ ...entry, status: 'error', message: err.message }, ...prev])
    } finally {
      setProgress(0)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  function clearHistory() {
    if (!window.confirm('Clear upload history? This only clears the local list, not backend events.')) return
    setHistory([])
  }

  return (
    <>
      <div>
        <h1 className="text-lg font-bold text-ink">Upload Logs</h1>
        <p className="text-[12.5px] text-ink-faint mt-0.5">
          Offline authentication analysis — import previously captured .json or .csv authentication logs.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Events" value={totalEvents} />
        <Stat label="Successful Uploads" value={successCount} valueClass="text-brand-green" />
        <Stat label="Failed Uploads" value={errorCount} valueClass="text-brand-red" />
        <Stat label="Unique IPs" value={uniqueIps} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 flex flex-col gap-5">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`card flex flex-col items-center justify-center text-center px-6 py-14 border-2 border-dashed transition-colors ${
              dragActive ? 'border-brand-primary bg-brand-primary/5' : 'border-panel-border'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-brand-primary/15 flex items-center justify-center mb-4">
              <UploadCloud size={24} className="text-brand-primary" />
            </div>
            <p className="text-[14px] font-semibold text-ink mb-1">Drag &amp; drop a log file here</p>
            <p className="text-[12px] text-ink-faint mb-4">Supports .json and .csv, matching log_parser.py</p>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading || scanning}
              className="flex items-center gap-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-[13px] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Browse Files
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {uploading && (
              <div className="w-full max-w-xs mt-6">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-ink-muted flex items-center gap-1.5">
                    <Loader2 size={11} className="animate-spin" />
                    Uploading {selectedFile?.name}
                  </span>
                  <span className="text-[11px] text-ink-muted">{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-panel-border overflow-hidden">
                  <div
                    className="h-full bg-brand-primary rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {validationError && (
              <div className="flex items-center gap-1.5 mt-4 text-[11.5px] text-brand-red">
                <FileWarning size={13} />
                {validationError}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-semibold text-ink">Upload History</p>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1 text-[11.5px] text-ink-faint hover:text-brand-red transition-colors"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-[12.5px] text-ink-faint text-center py-8">No uploads yet this session.</p>
            ) : (
              <div className="flex flex-col divide-y divide-panel-border">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 py-3">
                    {h.kind === 'json' ? (
                      <FileJson size={18} className="text-brand-primary shrink-0" />
                    ) : (
                      <FileSpreadsheet size={18} className="text-brand-primary shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-ink truncate">{h.name}</p>
                      <p className="text-[11px] text-ink-faint">
                        {formatBytes(h.size)} · {h.timestamp}
                        {h.status === 'success' && ` · ${h.eventsImported} event(s) imported`}
                      </p>
                    </div>
                    {h.status === 'success' ? (
                      <CheckCircle2 size={16} className="text-brand-green shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-brand-red shrink-0" title={h.message} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <EventsBySourceChart
            data={[
              { name: 'Parsed Successfully', value: successCount },
              { name: 'Failed to Parse', value: errorCount },
            ].filter((d) => d.value > 0)}
            total={successCount + errorCount}
            title="Parsing Status"
            emptyLabel="No uploads yet"
          />

          <div className="card p-5">
            <p className="text-[14px] font-semibold text-ink mb-3">Authentication Summary</p>
            <div className="flex flex-col gap-2.5">
              <Row label="Total Events" value={totalEvents} />
              <Row label="Successful Logins" value={successfulLogins} valueClass="text-brand-green" />
              <Row label="Failed Logins" value={failedLogins} valueClass="text-brand-amber" />
              <Row label="Unique IPs" value={uniqueIps} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Stat({ label, value, valueClass = 'text-ink' }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-[12px] text-ink-muted mb-2">{label}</p>
      <p className={`text-2xl font-extrabold ${valueClass}`}>{(value ?? 0).toLocaleString()}</p>
    </div>
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

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n.toFixed(1)} ${units[i]}`
}
