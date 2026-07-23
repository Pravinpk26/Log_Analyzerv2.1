// Client-side export helpers. CSV/JSON are fully real (no backend endpoint
// needed — the frontend already has everything it's exporting). PDF uses
// the browser's native print-to-PDF via a print-optimized stylesheet
// (#print-report in index.css) rather than inventing a backend PDF
// endpoint that doesn't exist yet.

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportEventsAsCsv(events, filename = 'authentication-events.csv') {
  if (!events || events.length === 0) return
  const columns = ['timestamp', 'username', 'ip_address', 'status', 'browser', 'response_time', 'current_url']
  const geoColumns = ['country', 'city', 'isp']

  const header = [...columns, ...geoColumns].join(',')
  const rows = events.map((ev) => {
    const base = columns.map((c) => csvEscape(ev[c]))
    const geo = ev.geo || {}
    const geoVals = geoColumns.map((c) => csvEscape(geo[c]))
    return [...base, ...geoVals].join(',')
  })

  download(filename, [header, ...rows].join('\n'), 'text/csv')
}

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportReportAsJson(report, filename = 'security-report.json') {
  download(filename, JSON.stringify(report, null, 2), 'application/json')
}

export function exportViaPrint() {
  window.print()
}
