import { useState } from 'react'
import { ChevronDown, BookOpen, HelpCircle, FileText, Mail, Layers, Workflow } from 'lucide-react'

const FAQ = [
  {
    q: 'Why did my upload say "Unsupported log format"?',
    a: 'The backend log_parser.py only parses .json and .csv files. Anything else (e.g. .log, .txt, .xml) will raise an error by design — convert it first.',
  },
  {
    q: 'Why does Run Scan open a visible browser window?',
    a: 'interaction_engine.py launches Playwright with headless=False, so the scan runs in a real, visible Chromium window on the machine running the backend. This is intentional for demoing the login interaction.',
  },
  {
    q: 'Why is the Security Score different before and after a scan?',
    a: 'Before any scan, the score is a baseline estimate from login activity alone. After a live scan, the real risk_engine.py result (which also factors in HTTPS/HSTS/CSP/cookie signals) becomes the canonical value everywhere in the app.',
  },
  {
    q: 'Does data persist if I restart the backend?',
    a: 'No — events are stored in-memory only (services/event_store.py). Restarting uvicorn clears everything. Persistent storage is a planned future enhancement.',
  },
  {
    q: 'What does "Reset Session" do?',
    a: 'It calls POST /reset, which clears the backend event store and login history, and clears the frontend\u2019s local anomaly log and source counters — a clean slate for demos.',
  },
]

export default function HelpPage() {
  const [openIdx, setOpenIdx] = useState(0)

  return (
    <>
      <div>
        <h1 className="text-lg font-bold text-ink">Help &amp; Docs</h1>
        <p className="text-[12.5px] text-ink-faint mt-0.5">Architecture overview, workflow, FAQ, and support.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Workflow size={15} className="text-brand-primary" />
            <p className="text-[14px] font-semibold text-ink">Workflow</p>
          </div>
          <ol className="flex flex-col gap-2.5 text-[12.5px] text-ink-muted">
            <Step n={1} text="Run a live scan (a login URL) or upload a .json/.csv log file." />
            <Step n={2} text="Playwright visits the page, collects network/security/session/auth signals." />
            <Step n={3} text="Risk Engine computes a Security Score; Anomaly Detector flags suspicious patterns." />
            <Step n={4} text="The AI Analysis Engine turns those findings into Observation → Risk → Recommendation insights." />
            <Step n={5} text="Everything surfaces consistently across the Dashboard, Alerts, Threat Intelligence, and Reports." />
          </ol>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={15} className="text-brand-primary" />
            <p className="text-[14px] font-semibold text-ink">Architecture Overview</p>
          </div>
          <div className="text-[12px] text-ink-muted leading-relaxed space-y-2">
            <p className="font-mono text-[11.5px] text-ink-faint">
              Frontend: Dashboard → API Layer → useDashboardData() → Derived Data Layer → Components
            </p>
            <p className="font-mono text-[11.5px] text-ink-faint">
              Backend: Playwright → Signal Collector → Auth Event Collector → Risk Engine → AI Insights Engine →
              Dashboard Summary → REST API
            </p>
            <p>
              Every page reads from one shared <code className="text-brand-primary">DashboardDataContext</code>, so
              KPIs, charts, tables, AI insights, and reports always agree with each other.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={15} className="text-brand-primary" />
          <p className="text-[14px] font-semibold text-ink">Supported Log Formats</p>
        </div>
        <p className="text-[12.5px] text-ink-muted">
          <code className="text-brand-primary">.json</code> and <code className="text-brand-primary">.csv</code> only,
          matching <code className="text-ink-faint">services/log_parser.py</code>. Each row/object becomes one
          authentication event in the shared event store.
        </p>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle size={15} className="text-brand-primary" />
          <p className="text-[14px] font-semibold text-ink">FAQ</p>
        </div>
        <div className="flex flex-col divide-y divide-panel-border">
          {FAQ.map((item, i) => (
            <div key={i} className="py-3">
              <button
                onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="text-[12.5px] font-medium text-ink pr-4">{item.q}</span>
                <ChevronDown
                  size={15}
                  className={`text-ink-faint shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`}
                />
              </button>
              {openIdx === i && <p className="text-[12px] text-ink-muted leading-relaxed mt-2 pr-6">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={15} className="text-brand-primary" />
          <p className="text-[14px] font-semibold text-ink">Documentation &amp; Contact</p>
        </div>
        <p className="text-[12.5px] text-ink-muted mb-2">
          Full setup instructions live in the project <code className="text-brand-primary">README.md</code> (backend
          wiring, environment variables, and the file-by-file changelog).
        </p>
        <p className="text-[12.5px] text-ink-muted flex items-center gap-1.5">
          <Mail size={13} className="text-ink-faint" />
          Questions about this build: contact the project owner directly (internship handover contact).
        </p>
      </div>
    </>
  )
}

function Step({ n, text }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-full bg-brand-primary/15 text-brand-primary text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <span>{text}</span>
    </li>
  )
}
