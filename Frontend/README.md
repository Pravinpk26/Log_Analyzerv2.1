# Log Analyzer — Mini SOC Dashboard (v2.0)

A production-oriented React + Vite + Tailwind frontend, wired to a FastAPI +
Playwright backend, built as a complete Authentication Security Operations
Center demo suitable for internship handover.

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # edit if your backend isn't on localhost:8000
npm run dev
```

Backend:
```bash
uvicorn main:app --reload
```

Log in with the demo credentials shown on the login screen (`admin` /
`admin123`) — click "Fill demo credentials" to autofill them.

## What's in this build

### Routing & Auth
- Full React Router setup: `/login`, `/dashboard`, `/upload-logs`,
  `/log-sources`, `/alerts`, `/threat-intel`, `/reports`, `/settings`,
  `/help`, plus `/` → `/dashboard` redirect and a 404 page for unknown
  routes.
- Mock authentication (`src/services/authService.js`) — structured so a real
  backend login call is a one-file swap; everything else already treats it
  as async.
- Dashboard routes are protected; unauthenticated visits redirect to
  `/login` and return to the originally-requested page after signing in.

### Single source of truth
- `src/hooks/useDashboardData.js` owns all backend I/O and session state.
- `src/hooks/useDerivedData.js` is the ONLY place that turns raw
  events/anomalies into metrics (sparklines, time series, country stats,
  risk score, alert rows, etc.) — every page calls this instead of
  recomputing its own numbers, so KPIs/charts/AI panel/reports always agree.

### Bug fixes from the previous pass
- **KPI vs. chart anomaly mismatch** — both now derive from the same
  `anomalyLog`, bucketed the same way (`derive.js: buildTimeSeries` +
  `groupAnomalyLogByDay`).
- **Anomaly log only updated after a live scan** — `useDashboardData` now
  checks the latest event on every refresh (poll, post-upload, post-reload)
  via a dedup key (`timestamp|ip`), not just after `/scan`.
- **Two different "risk" formulas** — removed the duplicate formula from
  `dashboard_summary.py`; there's now exactly one canonical Security Score
  (0–100, higher = safer): the real `risk_engine.py` result after a live
  scan, or a single documented baseline estimate before one has run
  (`computeCanonicalRisk` in `derive.js`). Renamed from "Risk Score" to
  **Security Score** everywhere for clarity (higher = better, matching the
  actual formula).
- **Decorative dotted world map** — replaced with `src/components/WorldMap.jsx`,
  an interactive component plotting real lat/lon from GeoService data, with
  heat-intensity coloring and hover tooltips (country, events, failed
  logins, risk tier). No external mapping library added.
- **Event Overview was day-only** — `buildTimeSeries` now supports
  Day (hourly) / Week (daily) / Month (weekly) / Year (monthly) real
  aggregation from actual event timestamps, with a working dropdown.
- **KPI sparklines** — restored, built from real per-day history
  (`buildKpiSparklines`); render nothing if there's under 2 days of data
  rather than faking a trend.
- **Misleading footer** — now only lists formats `log_parser.py` actually
  parses (JSON/CSV), and states plainly that storage is in-memory/temporary.
- **Simultaneous scan + upload** — Topbar and Upload page now disable each
  action while the other is running.

### New: real AI Analysis Engine (backend)
`services/ai_insights_engine.py` — deterministic, rule-based, no API key/
network dependency. Every insight follows **Observation → Risk →
Recommendation**. Analyzers cover: repeated failed logins, distributed
IP access, multiple countries, geo/hosting-provider signals, off-hours
timing, response latency, and (new) weak security headers when scan
`signals` are available. Exposed via `/scan`'s `ai_insights` field and a
standalone `GET /ai-insights` for polling. See the file's docstring for how
to swap in a real LLM later without frontend changes.

### New: Reset Session
`POST /reset` clears the backend's in-memory event store + login history
(reusing the existing `clear_events()`/`clear_history()` functions — no
duplicate logic). The Topbar's "Reset Session" button clears this plus the
frontend's local anomaly log/source counters, for clean demos.

### New: Authentication Signals panel
Surfaces `signal_collector.py` + `Log_categorizer.py` output (HTTPS, TLS
version, HSTS, CSP, secure cookies, server, redirect count, response time,
login method, MFA indicator) — data your backend was already collecting but
never displayed anywhere.

### New pages (all real, backend-reusing content — no placeholders)
- **Upload Logs** — drag & drop, browse, real upload progress (XHR), format
  validation, local upload history, parsing-status donut, authentication
  summary.
- **Log Sources** — connected sources (Live Monitoring / JSON Upload / CSV
  Upload) with health/status/last-activity, source activity timeline
  (reused `EventOverviewChart`), Interaction Engine detail from the last
  scan.
- **Alerts** — full searchable/filterable table of every anomaly recorded
  this session (not just top 5), with severity filter chips and
  category counts (failed login / suspicious login / geographic).
- **Threat Intelligence** — Security Score, threat level, active threats, AI
  confidence, threat timeline, risk breakdown donut, threat categories,
  full AI recommendations list, authentication summary.
- **Reports** — executive summary (auto-generated from live stats), full
  charts, real **CSV** export (events) and **JSON** export (full report
  object) via client-side `Blob` download, and **PDF** export via the
  browser's print-to-PDF (`#print-report` print stylesheet). A note in the
  UI flags that a dedicated backend-rendered PDF endpoint is a
  `// TODO: Backend Integration Required` future enhancement.
- **Settings** — all real and locally persisted: reduced-motion toggle,
  notification badges, session timeout (drives auto-logout... see note
  below), API base URL override (actually used by `api.js`), dashboard
  poll interval (actually feeds the data hook), About section.
- **Help & Docs** — workflow steps, architecture overview, supported
  formats, FAQ accordion, documentation/contact pointers.

### Known TODOs (marked in-app as `// TODO: Backend Integration Required`)
- Real backend authentication (currently mocked).
- Backend-rendered PDF export endpoint (currently browser print-to-PDF).
- Configurable scan timeout (Playwright's timeout isn't exposed via the API
  yet).
- MFA enforcement toggle in Settings (no auth backend to enforce it against).
- Session-timeout auto-logout is stored as a setting but not yet wired to an
  actual idle timer — flagged here rather than silently doing nothing.

## Project structure

```
src/
  lib/            api.js, derive.js (pure aggregation functions), exportUtils.js
  hooks/          useDashboardData.js (backend I/O + session state)
                  useDerivedData.js (THE single source of truth for metrics)
  services/       authService.js (mock auth, swap-in point for real backend)
  context/        AuthContext, SettingsContext, DashboardDataContext
  components/     Sidebar, Topbar, Footer, KpiCards, charts, tables, WorldMap,
                  AuthenticationSignals, AIInsights, layout/AppLayout,
                  layout/ProtectedRoute
  pages/          LoginPage + one page per sidebar item + NotFoundPage
  App.jsx         router root
```

## Backend setup (companion `backend_updates/` folder)

- `services/ai_insights_engine.py` → drop into your `services/` folder.
- `services/dashboard_summary.py` → replaces the version with a duplicate,
  inconsistent risk formula.
- `main.py` → adds the `/ai-insights` and `/reset` routes, passes `signals`
  into the AI engine during `/scan`, and renames the canonical score
  semantics (still returned under the `risk` key, unchanged shape).

Diff these against your current backend before overwriting, in case you've
made other changes since.
