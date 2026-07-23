import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  UploadCloud,
  Database,
  Bell,
  ShieldAlert,
  FileText,
  Settings,
  HelpCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: UploadCloud, label: 'Upload Logs', to: '/upload-logs' },
  { icon: Database, label: 'Log Sources', to: '/log-sources' },
  { icon: Bell, label: 'Alerts', to: '/alerts', badge: true },
  { icon: ShieldAlert, label: 'Threat Intelligence', to: '/threat-intel' },
  { icon: FileText, label: 'Reports', to: '/reports' },
  { icon: Settings, label: 'Settings', to: '/settings' },
  { icon: HelpCircle, label: 'Help & Docs', to: '/help' },
]

export default function Sidebar({ alertCount = 0, connected }) {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-panel-border bg-base-soft/60 px-4 py-5">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center">
          <ShieldCheck size={18} className="text-brand-primary" />
        </div>
        <div className="leading-tight">
          <p className="font-bold text-[15px] text-ink">Log Analyzer</p>
          <p className="text-[11px] text-ink-faint">Mini SOC Dashboard</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ icon: Icon, label, to, badge }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-brand-primary/15 text-brand-primary'
                  : 'text-ink-muted hover:bg-panel-soft hover:text-ink'
              }`
            }
          >
            <span className="flex items-center gap-2.5">
              <Icon size={16} />
              {label}
            </span>
            {badge && alertCount > 0 && (
              <span className="text-[10px] font-bold bg-brand-red/20 text-brand-red px-1.5 py-0.5 rounded-full">
                {alertCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-brand-primary" />
            <p className="text-[13px] font-semibold text-ink">AI Analysis Engine</p>
          </div>
          <p className="text-[11.5px] text-ink-muted leading-relaxed mb-3">
            Detecting anomalies and threats in your logs using rule-based heuristic analysis.
          </p>
          <span
            className={`tag ${
              connected ? 'bg-brand-green/15 text-brand-green' : 'bg-ink-faint/15 text-ink-faint'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-brand-green' : 'bg-ink-faint'}`} />
            {connected ? 'Active' : 'Offline'}
          </span>
        </div>
      </div>
    </aside>
  )
}
