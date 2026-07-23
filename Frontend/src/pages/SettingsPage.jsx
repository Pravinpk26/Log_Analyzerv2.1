import { useState } from 'react'
import { Palette, Bell, Shield, Server, SlidersHorizontal, Info, Save, RotateCcw } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import { getApiBase } from '../lib/api'

export default function SettingsPage() {
  const { settings, updateSetting, resetSettings, effectiveApiBase } = useSettings()
  const [apiInput, setApiInput] = useState(settings.apiBaseUrl || '')
  const [saved, setSaved] = useState(false)

  function saveApiBase() {
    updateSetting('apiBaseUrl', apiInput.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <>
      <div>
        <h1 className="text-lg font-bold text-ink">Settings</h1>
        <p className="text-[12.5px] text-ink-faint mt-0.5">Preferences are stored locally in your browser.</p>
      </div>

      <Section icon={Palette} title="Theme">
        <p className="text-[12px] text-ink-muted mb-3">
          The Dark Enterprise theme (charcoal + orange accent) is the approved look for this build and isn't
          user-switchable. Reduced motion disables the pulsing status indicator animation.
        </p>
        <Toggle
          label="Reduced motion"
          checked={settings.reducedMotion}
          onChange={(v) => updateSetting('reducedMotion', v)}
        />
      </Section>

      <Section icon={Bell} title="Notifications">
        <Toggle
          label="Show alert badge counts in sidebar/topbar"
          checked={settings.notificationsEnabled}
          onChange={(v) => updateSetting('notificationsEnabled', v)}
        />
      </Section>

      <Section icon={Shield} title="Security Preferences">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[12.5px] text-ink">Session timeout</p>
            <p className="text-[11px] text-ink-faint">Automatically sign out after this many minutes of inactivity.</p>
          </div>
          <select
            value={settings.sessionTimeoutMins}
            onChange={(e) => updateSetting('sessionTimeoutMins', Number(e.target.value))}
            className="bg-panel-soft border border-panel-border rounded-lg px-2.5 py-1.5 text-[12.5px] text-ink"
          >
            {[15, 30, 60, 120].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </div>
        <Toggle
          label="Require MFA for sign-in"
          checked={settings.mfaRequired}
          onChange={(v) => updateSetting('mfaRequired', v)}
          note="// TODO: Backend Integration Required — no auth backend to enforce this yet"
        />
      </Section>

      <Section icon={Server} title="API Configuration">
        <p className="text-[12px] text-ink-muted mb-3">
          Current backend: <code className="text-brand-primary">{effectiveApiBase}</code>
        </p>
        <div className="flex items-center gap-2">
          <input
            value={apiInput}
            onChange={(e) => setApiInput(e.target.value)}
            placeholder="http://localhost:8000"
            className="flex-1 bg-panel-soft border border-panel-border rounded-lg px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-brand-primary/60"
          />
          <button
            onClick={saveApiBase}
            className="flex items-center gap-1.5 bg-brand-primary/15 text-brand-primary border border-brand-primary/30 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold hover:bg-brand-primary/25 transition-colors"
          >
            <Save size={13} />
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
        <p className="text-[11px] text-ink-faint mt-2">Reload the page after changing this for it to fully take effect everywhere.</p>
      </Section>

      <Section icon={SlidersHorizontal} title="Scan Preferences">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[12.5px] text-ink">Dashboard refresh interval</p>
            <p className="text-[11px] text-ink-faint">How often the dashboard polls /dashboard and /ai-insights.</p>
          </div>
          <select
            value={settings.pollIntervalMs}
            onChange={(e) => updateSetting('pollIntervalMs', Number(e.target.value))}
            className="bg-panel-soft border border-panel-border rounded-lg px-2.5 py-1.5 text-[12.5px] text-ink"
          >
            <option value={5000}>5 seconds</option>
            <option value={15000}>15 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>60 seconds</option>
          </select>
        </div>
        <p className="text-[11px] text-ink-faint font-mono mt-3">
          // TODO: Backend Integration Required — default Playwright scan timeout isn't currently exposed by the
          backend for configuration.
        </p>
      </Section>

      <Section icon={Info} title="About">
        <div className="flex flex-col gap-1.5 text-[12.5px] text-ink-muted">
          <p><span className="text-ink font-medium">Log Analyzer</span> — Mini SOC Dashboard, v2.0.0</p>
          <p>Frontend: React 18 + Vite + Tailwind CSS + Recharts + React Router</p>
          <p>Backend: FastAPI + Playwright, in-memory event store</p>
          <p>AI Engine: Rule-based (v1) — see services/ai_insights_engine.py</p>
          <p className="text-ink-faint mt-1">Built for internship handover and portfolio presentation.</p>
        </div>
      </Section>

      <button
        onClick={resetSettings}
        className="flex items-center gap-1.5 text-[12.5px] text-ink-faint hover:text-brand-red transition-colors self-start"
      >
        <RotateCcw size={13} />
        Reset all settings to defaults
      </button>
    </>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className="text-brand-primary" />
        <p className="text-[14px] font-semibold text-ink">{title}</p>
      </div>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange, note }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <span className="text-[12.5px] text-ink">{label}</span>
        {note && <p className="text-[10.5px] text-ink-faint font-mono mt-0.5">{note}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-5.5 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-brand-primary' : 'bg-panel-border'}`}
        style={{ height: 22, width: 40 }}
      >
        <span
          className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform"
          style={{ height: 18, width: 18, transform: checked ? 'translateX(20px)' : 'translateX(3px)' }}
        />
      </button>
    </div>
  )
}
