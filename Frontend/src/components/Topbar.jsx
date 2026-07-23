import { useState } from 'react'
import { UploadCloud, Bell, Search, Loader2, ScanLine, RotateCcw, ChevronDown, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Topbar({
  onScan,
  onUploadClick,
  onReset,
  scanning,
  uploading,
  resetting,
  connected,
  alertCount,
}) {
  const [url, setUrl] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()

  const busy = scanning || uploading || resetting

  function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim() || scanning || uploading) return
    onScan(url.trim())
  }

  return (
    <header className="flex flex-wrap items-center gap-3 justify-between px-6 py-4 border-b border-panel-border">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 min-w-[260px] max-w-xl">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={uploading}
            placeholder="Scan a login URL, e.g. https://example.com/login"
            className="w-full bg-panel border border-panel-border rounded-lg pl-9 pr-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-brand-primary/60 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={scanning || uploading}
          title={uploading ? 'An upload is in progress' : undefined}
          className="flex items-center gap-1.5 bg-brand-primary/15 hover:bg-brand-primary/25 text-brand-primary border border-brand-primary/30 text-[13px] font-semibold px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
          {scanning ? 'Scanning…' : 'Run Scan'}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <button
          onClick={onUploadClick}
          disabled={scanning}
          title={scanning ? 'A scan is in progress' : undefined}
          className="flex items-center gap-1.5 bg-panel border border-panel-border hover:border-brand-primary/40 text-ink text-[13px] font-medium px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <UploadCloud size={14} />
          Upload Logs
        </button>

        <button
          onClick={onReset}
          disabled={busy}
          title="Clear all events and start a fresh demo session"
          className="hidden md:flex items-center gap-1.5 bg-panel border border-panel-border hover:border-brand-primary/40 text-ink-muted hover:text-ink text-[13px] font-medium px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          Reset Session
        </button>

        <span
          className={`hidden xl:flex tag ${connected ? 'bg-brand-green/15 text-brand-green' : 'bg-brand-red/15 text-brand-red'}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-brand-green scan-pulse' : 'bg-brand-red'}`}
          />
          {connected ? 'Real-time Monitoring · Active' : 'Backend Unreachable'}
        </span>

        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-panel-border text-ink-muted hover:text-ink hover:border-brand-primary/40 transition-colors">
          <Bell size={15} />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-brand-red text-white text-[9px] font-bold">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-1.5"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-primary to-[#B8390E] flex items-center justify-center text-[12px] font-bold text-white">
              {user?.initials || 'U'}
            </div>
            <ChevronDown size={13} className="text-ink-faint hidden md:block" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-52 card p-2 shadow-panel">
                <div className="px-2.5 py-2 mb-1 border-b border-panel-border">
                  <p className="text-[12.5px] font-semibold text-ink flex items-center gap-1.5">
                    <User size={12} />
                    {user?.displayName || 'User'}
                  </p>
                  <p className="text-[11px] text-ink-faint mt-0.5">{user?.role || 'Analyst'}</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[12.5px] text-ink-muted hover:bg-panel-soft hover:text-brand-red transition-colors"
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
