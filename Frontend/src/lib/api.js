// Base URL of the FastAPI backend (main.py). Resolution order:
// 1. A runtime override saved from the Settings page (localStorage)
// 2. VITE_API_BASE_URL from .env
// 3. http://localhost:8000
const STORAGE_KEY = 'log_analyzer_api_base_url'

export function getApiBase() {
  try {
    const override = localStorage.getItem(STORAGE_KEY)
    if (override) return override
  } catch {
    // localStorage unavailable (private browsing etc.) — fall through
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
}

export function setApiBase(url) {
  try {
    if (url) localStorage.setItem(STORAGE_KEY, url)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

async function handle(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json()
}

// GET /dashboard -> dashboard_summary.py output
export function fetchDashboardSummary() {
  return fetch(`${getApiBase()}/dashboard`).then(handle)
}

// GET /events -> { events: [...] }
export function fetchEvents() {
  return fetch(`${getApiBase()}/events`).then(handle)
}

// GET /scan?url=... -> runs the full Playwright pipeline against a live login page
export function scanUrl(url) {
  const qs = new URLSearchParams({ url })
  return fetch(`${getApiBase()}/scan?${qs.toString()}`).then(handle)
}

// GET /ai-insights -> rule-based AI Analysis Engine output (services/ai_insights_engine.py)
export function fetchAIInsights() {
  return fetch(`${getApiBase()}/ai-insights`).then(handle)
}

// POST /precise-location {latitude, longitude, accuracy} -> reverse-geocoded
// neighbourhood-level location, used by the next /scan call.
export function submitPreciseLocation(coords) {
  return fetch(`${getApiBase()}/precise-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(coords),
  }).then(handle)
}

// GET /precise-location -> currently cached precise location, if any
export function fetchPreciseLocation() {
  return fetch(`${getApiBase()}/precise-location`).then(handle)
}

// Requests location from THIS browser tab (a real permission prompt the
// user can click "Allow" on) — unlike the automated Playwright browser,
// which can't get past the OS-level permission dialog at all.
export function requestBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => reject(new Error(err.message || 'Location permission denied.')),
      { timeout: 10000, maximumAge: 0 },
    )
  })
}

// POST /upload-log (multipart file: .json or .csv), with real upload progress
// via XMLHttpRequest (fetch doesn't expose upload progress events).
export function uploadLogFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${getApiBase()}/upload-log`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('Invalid JSON response from /upload-log'))
        }
      } else {
        reject(new Error(`${xhr.status} ${xhr.statusText}: ${xhr.responseText}`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload.'))

    xhr.send(formData)
  })
}

// POST /reset -> clears the in-memory event store + login history
export function resetSession() {
  return fetch(`${getApiBase()}/reset`, { method: 'POST' }).then(handle)
}
