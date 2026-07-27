# 📊 Log Analyzer Dashboard 

An authentication log monitoring and threat-detection dashboard that provides real-time security visualization, computed anomaly/threat detection, MITRE ATT&CK mapping, AI-assisted incident summaries, and geolocation-based login analysis through an interactive web interface.

---

## 📖 Overview

The Log Analyzer Dashboard helps security analysts monitor and analyze authentication activity from web applications, either from a live session or from imported logs.

The dashboard supports two analysis modes:

- 🌐 **Live Authentication Monitoring** – Opens a real, visible browser session against a login URL you provide and captures authentication signals from it. The browser stays open until you close it yourself.
- 📂 **Offline Log Analysis** – Imports JSON/CSV authentication logs for visualization and security analysis. Minimal logs (just an IP, timestamp, username, browser, status) are automatically enriched with geolocation and proxy/hosting reputation — you don't need to supply location data yourself.

The project presents authentication data using enterprise-style dashboards, helping you identify suspicious login behavior, authentication failures, geographic login distribution, and concrete security gaps.

---

# ✨ Features

### Authentication Monitoring
- Live authentication session analysis via a real, visible browser (Playwright) — stays open under your control, never auto-closes mid-flow
- Authentication event collection, normalized across both live scans and uploaded logs
- Login statistics (total events, failed logins, unique IPs)
- Authentication signal inspection (HTTPS/HSTS/CSP, cookie security, MFA indicator, etc.)

### Threat Detection Engine
Real, computed detection (not placeholder flags) for the seven core authentication red flags:
- **Impossible Travel** — haversine distance/time math between consecutive logins
- **Unrecognized Device** — tracks per-account browser history
- **Odd-Hour Logins** — flags authentication during configurable quiet hours
- **Unsolicited MFA Prompts** — flags MFA challenges with no matching active login attempt
- **Repeated Password Resets** — flags multiple reset requests within a time window
- **Disabled Security Controls** — flags MFA/login-alert settings being turned off
- **Suspicious IP Addresses** — flags proxy, VPN, and hosting/datacenter-range logins

Every finding includes a severity, a confidence score, and a **MITRE ATT&CK** tactic/technique mapping.

### Geolocation
- Automatic IP-based geolocation (city-level, ~85–90% typical accuracy) via ip-api.com's free tier — no API key required
- Real proxy/hosting/mobile reputation flags, not keyword guessing
- Optional **precise, neighbourhood-level location**: click "Enable Precise Location" in the dashboard to grant a real browser geolocation permission (Wi-Fi/GPS-based, via your OS's location services), reverse-geocoded into an actual area name
- Clear labeling when a location reflects a cloud/hosting data center rather than a real residential origin

### AI & Reporting
- Attack-type classification (Brute Force, Credential Stuffing, Account Takeover, MFA Fatigue, etc.)
- Vulnerability/loophole indicators (missing MFA, missing security headers, no lockout policy, etc.)
- AI-based incident summaries via Google's Gemini API, with a deterministic rule-based fallback if no key is configured
- Consolidated Executive Report: summary, critical alerts, high-risk IPs, attack timeline, top error types, recommended actions, and an overall score

### Log Analysis
- JSON log upload
- CSV log upload (minimal columns supported — geolocation is filled in automatically)
- Authentication log categorization
- Event timeline visualization

### Dashboard Visualizations
- KPI summary cards (Total Events, Anomalies, Failed Logins, Unique IPs, Security Score)
- Event Overview timeline
- World login distribution map + Top Cities breakdown
- Events by source
- Suspicious IP analysis (with city/area-level location, not just country)
- Top anomalies
- Authentication signal panel
- AI Insights panel
- Report generation

---

# 🛠️ Technology Stack

## Frontend
- React
- Vite
- Tailwind CSS
- React Router
- Recharts
- React Simple Maps
- Lucide React

## Backend
- Python
- FastAPI

## Libraries
- Playwright
- BeautifulSoup
- Requests
- python-dotenv

## External services (all free-tier, no paid keys required)
- [ip-api.com](https://ip-api.com) — IP geolocation + proxy/hosting reputation
- [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org) — reverse geocoding for precise location
- [Google Gemini API](https://aistudio.google.com/apikey) — AI incident summaries (optional; falls back gracefully if not configured)

---

# 📁 Project Structure

```
Backend/
│
├── models/
│   └── authentication_event.py
│
├── services/
│   ├── interaction_engine.py          # Live browser scan (Playwright)
│   ├── signal_collector.py            # Builds signals from a scan
│   ├── log_parser.py                  # JSON/CSV log normalization + geo enrichment
│   ├── geo_service.py                 # IP geolocation (ip-api.com)
│   ├── precise_location_service.py    # Reverse geocoding (Nominatim)
│   ├── threat_detection_engine.py     # The 7 red-flag detectors
│   ├── mitre_mapping.py               # MITRE ATT&CK lookup table
│   ├── attack_classifier.py           # Type-of-attack classification
│   ├── vulnerability_indicators.py    # Loophole / vulnerability detection
│   ├── gemini_incident_engine.py      # AI incident summaries (Gemini)
│   ├── executive_report.py            # Consolidated executive report
│   ├── anomaly_detector.py
│   ├── ai_insights_engine.py
│   ├── risk_engine.py
│   ├── security_score.py
│   ├── event_store.py
│   ├── login_history.py
│   ├── authentication_event_collector.py
│   └── dashboard_summary.py / dashboard_metrics.py
│
├── requirements.txt
├── .env.example
└── main.py
│
Frontend/
│
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   └── services/
│
├── .env.example
├── package.json
└── vite.config.js
```

---

# 🚀 Getting Started

## Backend

```bash
cd Backend
python -m venv venv

# Windows (PowerShell)
venv\Scripts\Activate.ps1

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
playwright install chromium
```

Add your Gemini API key (optional — the app works without it, using a rule-based fallback for incident summaries):

```bash
cp .env.example .env
```
Edit `.env` and set `GEMINI_API_KEY` to a key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (starts with `AIzaSy...`).

Run the backend:

```bash
uvicorn main:app --reload --port 8000
```

## Frontend

```bash
cd Frontend
npm install
cp .env.example .env      # point VITE_API_BASE_URL at http://localhost:8000
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

---

# 🔍 Using the Dashboard

### Live scan
1. Enter a login URL in the top bar and click **Run Scan**.
2. A real, visible Chromium window opens — log in as you normally would.
3. The browser stays open under your control. Close it yourself when you're done; analysis runs on whatever state it captures at that point.

### Precise location (optional)
Click **Enable Precise Location** in the top bar. This requests location permission in *this* browser tab (a real, clickable OS prompt) — click Allow. Requires location services to be turned on at the OS level. The next scan will use this instead of city-level IP data.

### Upload logs
Click **Upload Logs** and choose a JSON or CSV file. Minimal columns are enough:

```csv
timestamp,username,ip_address,browser,status
2026-07-22 09:00:00,pravin,49.207.10.5,Chrome,Success
```

Geolocation, proxy/hosting reputation, and threat detection all run automatically on upload.

---

# ⚠️ Known limitations

- **IP geolocation is city-level at best** (~85–90% typical accuracy for residential IPs). Neighbourhood-level detail requires the optional browser-geolocation feature above, and only works on a machine with location services enabled.
- **Precise location won't work in the automated scan browser** — Chromium's location permission requires an OS-level dialog that automation can't click through. Use the "Enable Precise Location" button in the dashboard's own tab instead.
- **Live monitoring drives a real browser session** and will be blocked by a site's own anti-automation controls (e.g. Google's "This browser or app may not be secure"); this app does not attempt to bypass those controls.
- Rule-based detection thresholds (odd-hours window, impossible-travel speed, reset-count threshold, etc.) are sensible defaults, not tuned to any specific organization's policy — adjust the constants in `threat_detection_engine.py` as needed.

---

# 📜 License

See `LICENSE` (add one if not already present in the repository).
