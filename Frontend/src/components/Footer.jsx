import { FileJson, FileSpreadsheet, HelpCircle, Lock, Database } from 'lucide-react'
import { Link } from 'react-router-dom'

// Only formats the backend's log_parser.py actually parses (.json / .csv) —
// previously this listed LOG/XML/TXT too, which would fail on upload.
const FORMATS = [
  { icon: FileJson, label: 'JSON' },
  { icon: FileSpreadsheet, label: 'CSV' },
]

export default function Footer() {
  return (
    <div className="card flex flex-col md:flex-row gap-6 md:gap-0 px-6 py-5 divide-y md:divide-y-0 md:divide-x divide-panel-border">
      <div className="flex-1 md:pr-6">
        <p className="text-[13px] font-semibold text-ink mb-2.5">Supported Log Formats</p>
        <div className="flex items-center gap-4 flex-wrap">
          {FORMATS.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-[12px] text-ink-muted">
              <Icon size={14} className="text-ink-faint" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 md:px-6 pt-6 md:pt-0">
        <p className="text-[13px] font-semibold text-ink mb-1.5 flex items-center gap-1.5">
          <HelpCircle size={14} className="text-ink-faint" />
          Need Help?
        </p>
        <p className="text-[12px] text-ink-muted">
          Visit{' '}
          <Link to="/help" className="text-brand-primary hover:underline">
            Help &amp; Docs
          </Link>{' '}
          for architecture, FAQ, and supported workflows.
        </p>
      </div>

      <div className="flex-1 md:pl-6 pt-6 md:pt-0">
        <p className="text-[13px] font-semibold text-ink mb-1.5 flex items-center gap-1.5">
          <Lock size={14} className="text-ink-faint" />
          Data Privacy &amp; Security
        </p>
        <p className="text-[12px] text-ink-muted flex items-start gap-1.5">
          <Database size={12} className="text-ink-faint mt-0.5 shrink-0" />
          The current version stores events in temporary in-memory storage only —
          nothing persists across a backend restart. Persistent database support is
          planned for a future release.
        </p>
      </div>
    </div>
  )
}
