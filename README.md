# 📊 Log Analyzer Dashboard

An enterprise-inspired authentication log monitoring dashboard that provides real-time security visualization, authentication event analysis, anomaly detection, risk scoring, and rule-based security recommendations through an interactive web interface.

---

## 📖 Overview

The Log Analyzer Dashboard is designed to help security analysts monitor and analyze authentication activities from web applications.

The dashboard supports two analysis modes:

- 🌐 **Live Authentication Monitoring** – Collects authentication signals from a live website session.
- 📂 **Offline Log Analysis** – Imports JSON/CSV authentication logs for visualization and security analysis.

The project presents authentication data using enterprise-style dashboards, allowing users to identify suspicious login behavior, authentication failures, geographical login distribution, and potential security risks.

---

# ✨ Features

### Authentication Monitoring
- Live authentication session analysis
- Authentication event collection
- Login statistics
- Authentication signal inspection

### Security Analytics
- Risk scoring engine
- Rule-based security recommendations
- Security posture analysis
- Authentication anomaly detection

### Log Analysis
- JSON log upload
- CSV log upload
- Authentication log categorization
- Event timeline visualization

### Dashboard Visualizations
- KPI summary cards
- Event Overview
- World login distribution map
- Events by source
- Suspicious IP analysis
- Top anomalies
- Authentication signal panel
- AI Insights panel
- Report generation

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

---

# 📁 Project Structure

```
Backend/
│
├── models/
├── services/
├── main.py
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
├── package.json
└── vite.config.js
```
# 🚀 Getting Started

## Backend

```bash
cd Backend

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend runs at

```
http://localhost:8000
```

---

## Frontend

```bash
cd Frontend

npm install

npm run dev
```

Frontend runs at

```
http://localhost:5173
```

---

Dashboard Modules

- Dashboard Overview
- Authentication Signals
- Event Overview
- World Login Map
- AI Insights
- Top Anomalies
- Suspicious IPs
- Reports
- Threat Intelligence
- Upload Logs
- Alerts
- Settings

Current Limitations

- Authentication signals depend on website structure.
- Dynamic websites may expose limited authentication metadata.
- Rule-based recommendations are currently used instead of machine learning.
- Data is currently stored in memory.

Future Enhancements

- Machine Learning based anomaly detection
- SIEM integration
- Real-time WebSocket monitoring
- Database persistence
- Multi-user authentication
- Role-based access control
- Export to PDF and Excel
- Cloud deployment
