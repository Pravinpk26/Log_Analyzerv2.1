// Turns a country code (e.g. "US", "IN") into a flag emoji.
export function countryFlag(code) {
  if (!code || code === 'Unknown' || code.length !== 2) return '🏳️'
  const A = 0x1f1e6
  const chars = code
    .toUpperCase()
    .split('')
    .map((c) => A + (c.charCodeAt(0) - 65))
  return String.fromCodePoint(...chars)
}

// Aggregates events by browser, for the donut chart.
export function aggregateByBrowser(events) {
  const counts = new Map()
  for (const ev of events) {
    const key = ev.browser || 'Unknown'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// Aggregates events by country, top N + "Others" bucket.
export function aggregateByCountry(events, topN = 5) {
  const counts = new Map()
  for (const ev of events) {
    const country = ev?.geo?.country
    if (!country || country === 'Unknown') continue
    const code = ev?.geo?.country_code
    const key = country
    if (!counts.has(key)) counts.set(key, { country, code, count: 0 })
    counts.get(key).count += 1
  }
  const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count)
  const top = sorted.slice(0, topN)
  const rest = sorted.slice(topN).reduce((sum, c) => sum + c.count, 0)
  return { top, others: rest }
}

// Aggregates events by IP address, computing a simple 0-100 exposure score
// from failure ratio + volume, for the "Top Suspicious IPs" table.
export function aggregateByIp(events, topN = 5) {
  const byIp = new Map()

  for (const ev of events) {
    const ip = ev.ip_address || 'Unknown'
    if (!byIp.has(ip)) {
      byIp.set(ip, {
        ip,
        country: 'Unknown',
        city: 'Unknown',
        total: 0,
        failed: 0,
        lastSeen: ev.timestamp || '',
      })
    }
    const bucket = byIp.get(ip)
    bucket.total += 1
    if ((ev.status || '').toLowerCase() === 'failed') bucket.failed += 1
    if ((ev.timestamp || '') > bucket.lastSeen) bucket.lastSeen = ev.timestamp

    // Location can arrive on ANY event for this IP, not necessarily the
    // first one seen (e.g. the first entry might predate geo enrichment,
    // or a later upload filled in what an earlier one left blank). Keep
    // the best (most specific, non-"Unknown") value found so far instead
    // of locking in whatever the first occurrence happened to have.
    const evCountry = ev?.geo?.country
    const evCity = ev?.geo?.city
    if (evCountry && evCountry !== 'Unknown' && bucket.country === 'Unknown') {
      bucket.country = evCountry
    }
    if (evCity && evCity !== 'Unknown' && bucket.city === 'Unknown') {
      bucket.city = evCity
    }
  }

  const rows = Array.from(byIp.values()).map((r) => {
    const failRatio = r.total ? r.failed / r.total : 0
    const volumeFactor = Math.min(r.total / 10, 1)
    const score = Math.round(failRatio * 70 + volumeFactor * 30)
    return { ...r, score: Math.min(100, Math.max(score, r.failed > 0 ? 20 : 5)) }
  })

  return rows.sort((a, b) => b.score - a.score || b.total - a.total).slice(0, topN)
}

// Aggregates events by specific city (not just country) — this is what
// answers "which exact place, not just which country" (e.g. Madurai
// rather than just India). Cities sharing a name in different countries
// are kept as distinct rows.
export function aggregateByCity(events, topN = 8) {
  const byCity = new Map()

  for (const ev of events) {
    const geo = ev.geo || {}
    const city = geo.city
    if (!city || city === 'Unknown') continue

    const country = geo.country || 'Unknown'
    const key = `${city}|${country}`

    if (!byCity.has(key)) {
      byCity.set(key, {
        city,
        country,
        code: geo.country_code,
        lat: geo.latitude,
        lon: geo.longitude,
        events: 0,
        failed: 0,
        ips: new Set(),
      })
    }
    const bucket = byCity.get(key)
    bucket.events += 1
    if ((ev.status || '').toLowerCase() === 'failed') bucket.failed += 1
    if (ev.ip_address) bucket.ips.add(ev.ip_address)
  }

  const rows = Array.from(byCity.values()).map((r) => ({
    city: r.city,
    country: r.country,
    code: r.code,
    lat: r.lat,
    lon: r.lon,
    events: r.events,
    failed: r.failed,
    uniqueIps: r.ips.size,
  }))

  return rows.sort((a, b) => b.events - a.events).slice(0, topN)
}

// Rolls up anomalies collected across scans into a "type -> stats" table.
export function aggregateAnomalies(anomalyLog, topN = 5) {
  const byType = new Map()

  for (const entry of anomalyLog) {
    for (const a of entry.anomalies) {
      const key = a.type
      if (!byType.has(key)) {
        byType.set(key, {
          type: a.type,
          message: a.message,
          severity: a.severity,
          count: 0,
          lastSeen: entry.timestamp,
        })
      }
      const bucket = byType.get(key)
      bucket.count += 1
      if (severityRank(a.severity) > severityRank(bucket.severity)) {
        bucket.severity = a.severity
      }
      if (entry.timestamp > bucket.lastSeen) bucket.lastSeen = entry.timestamp
    }
  }

  return Array.from(byType.values())
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.count - a.count)
    .slice(0, topN)
}

export function severityRank(sev) {
  if (sev === 'High') return 3
  if (sev === 'Medium') return 2
  if (sev === 'Low') return 1
  return 0
}

export function severityColor(sev) {
  if (sev === 'High') return { bg: 'bg-brand-red/15', text: 'text-brand-red', dot: 'bg-brand-red' }
  if (sev === 'Medium') return { bg: 'bg-brand-orange/15', text: 'text-brand-orange', dot: 'bg-brand-orange' }
  return { bg: 'bg-brand-green/15', text: 'text-brand-green', dot: 'bg-brand-green' }
}

// ---------------------------------------------------------------------------
// Centralized helpers added for the multi-page build.
// These exist so every page/component derives numbers the SAME way instead
// of recomputing its own version of "anomalies today" / "risk score" / etc.
// ---------------------------------------------------------------------------

// Groups the session's anomaly log into { "YYYY-MM-DD": count } so the
// Event Overview chart's "Anomalies" series always matches the KPI card's
// total (same underlying anomalyLog, just bucketed by day).
export function groupAnomalyLogByDay(anomalyLog) {
  const byDay = {}
  for (const entry of anomalyLog) {
    const day = (entry.timestamp || '').split(' ')[0]
    if (!day) continue
    byDay[day] = (byDay[day] || 0) + entry.anomalies.length
  }
  return byDay
}

// Builds small real-history sparkline arrays (last N days) for the KPI
// cards. Never invents trend data — if there's only one day of history,
// the sparkline is flat/one point, which is the honest answer.
export function buildKpiSparklines(events, anomalyLog, days = 7) {
  const byDay = new Map()
  for (const ev of events) {
    const day = (ev.timestamp || '').split(' ')[0]
    if (!day) continue
    if (!byDay.has(day)) byDay.set(day, { events: 0, failed: 0, ips: new Set() })
    const b = byDay.get(day)
    b.events += 1
    if ((ev.status || '').toLowerCase() === 'failed') b.failed += 1
    if (ev.ip_address) b.ips.add(ev.ip_address)
  }
  const anomalyByDay = groupAnomalyLogByDay(anomalyLog)

  const sortedDays = Array.from(byDay.keys()).sort().slice(-days)

  return {
    events: sortedDays.map((d) => byDay.get(d).events),
    failed: sortedDays.map((d) => byDay.get(d).failed),
    anomalies: sortedDays.map((d) => anomalyByDay[d] || 0),
    uniqueIps: sortedDays.map((d) => byDay.get(d).ips.size),
  }
}

// Single canonical risk score used EVERYWHERE (KPI gauge, Threat Intel,
// AI panel, Reports). Prefers the backend's real risk_engine result from a
// live /scan (it factors in actual security-header signals). Falls back to
// a documented, deterministic activity-only estimate when no scan has run
// yet, so the number is never fabricated differently in two places.
export function computeCanonicalRisk(statistics, scanRisk) {
  if (scanRisk && typeof scanRisk.risk_score === 'number') {
    return { score: scanRisk.risk_score, level: scanRisk.risk_level, source: 'risk_engine (live scan)' }
  }

  const failed = statistics?.failed_logins ?? 0
  const successful = statistics?.successful_logins ?? 0
  const uniqueIps = statistics?.unique_ips ?? 0

  let score = 100
  score -= failed * 15
  score -= uniqueIps > 3 ? 15 : 0
  score -= successful === 0 && failed > 0 ? 15 : 0
  score = Math.max(0, Math.min(100, score))

  const level = score >= 80 ? 'Low' : score >= 50 ? 'Medium' : 'High'
  return { score, level, source: 'baseline estimate (no live scan yet)' }
}

// Flattens the anomaly log into one row per anomaly (rather than grouped by
// type), each carrying the parent event's IP/country/timestamp — used by
// the Alerts page for a searchable/filterable table.
export function flattenAlerts(anomalyLog) {
  const rows = []
  for (const entry of anomalyLog) {
    for (const a of entry.anomalies) {
      rows.push({
        ...a,
        timestamp: entry.timestamp,
        ip: entry.ip || 'Unknown',
        country: entry.country || 'Unknown',
        browser: entry.browser || 'Unknown',
      })
    }
  }
  return rows.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
}

// Projects lat/lon onto a simple equirectangular SVG viewBox (0-360 x 0-180)
// for the interactive world map — no external mapping library.
export function projectLatLon(lat, lon, width = 360, height = 180) {
  const x = (lon + 180) * (width / 360)
  const y = (90 - lat) * (height / 180)
  return { x, y }
}

// ---------------------------------------------------------------------------
// Real, range-aware Event Overview aggregation.
// Buckets actual events chronologically — never plots one point per event
// and never fabricates a curve. If there's no data for a bucket, it's 0.
// ---------------------------------------------------------------------------

function parseTimestamp(ts) {
  if (!ts) return null

  // Supports ISO timestamps like:
  // 2026-07-07T09:10:15Z
  const isoDate = new Date(ts)
  if (!isNaN(isoDate.getTime())) {
    return isoDate
  }

  // Supports backend timestamps like:
  // 2026-07-10 20:09:55
  const [datePart, timePart = '00:00:00'] = ts.split(' ')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm, ss] = timePart.split(':').map(Number)

  if (!y || !m || !d) return null

  return new Date(y, m - 1, d, hh || 0, mm || 0, ss || 0)
}

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// range: 'day' -> hourly buckets for the most recent day with data
//        'week' -> daily buckets for the most recent 7 days with data
//        'month' -> weekly buckets for the most recent ~5 weeks
//        'year' -> monthly buckets for the most recent 12 months
export function buildTimeSeries(events, anomalyLog, range = 'week') {
  const parsed = events
    .map((ev) => ({ ev, date: parseTimestamp(ev.timestamp) }))
    .filter((x) => x.date)

  if (parsed.length === 0) return []

  const anomalyByDay = groupAnomalyLogByDay(anomalyLog)
  const anomalyTimestamps = anomalyLog.flatMap((entry) =>
    entry.anomalies.map(() => parseTimestamp(entry.timestamp))
  ).filter(Boolean)

  let bucketKeyFor, labelFor

  if (range === 'day') {
    // Hourly buckets across the single most recent calendar day that has events.
    const mostRecentDay = parsed.reduce((max, x) => (x.date > max ? x.date : max), parsed[0].date)
    const dayStr = mostRecentDay.toDateString()
    bucketKeyFor = (d) => (d.toDateString() === dayStr ? String(d.getHours()) : null)
    labelFor = (key) => `${String(key).padStart(2, '0')}:00`
  } else if (range === 'week') {
    bucketKeyFor = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    labelFor = (key, d) => `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
  } else if (range === 'month') {
    bucketKeyFor = (d) => isoWeekKey(d)
    labelFor = (key) => key
  } else {
    // year
    bucketKeyFor = (d) => `${d.getFullYear()}-${d.getMonth()}`
    labelFor = (key, d) => `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`
  }

  const buckets = new Map()

  for (const { ev, date } of parsed) {
    const key = bucketKeyFor(date)
    if (key === null) continue
    if (!buckets.has(key)) buckets.set(key, { key, date, events: 0, failed: 0, anomalies: 0 })
    const b = buckets.get(key)
    b.events += 1
    if ((ev.status || '').toLowerCase() === 'failed') b.failed += 1
  }

  // Fold anomaly counts into the same buckets using the same key function,
  // so the chart's "Anomalies" series is generated from the SAME grouping
  // logic as everything else (fixes KPI vs. chart mismatches).
  for (const anomDate of anomalyTimestamps) {
    const key = bucketKeyFor(anomDate)
    if (key === null || !buckets.has(key)) continue
    buckets.get(key).anomalies += 1
  }

  let series = Array.from(buckets.values()).sort((a, b) => (a.date > b.date ? 1 : -1))

  if (range === 'day') {
    series.sort((a, b) => Number(a.key) - Number(b.key))
  }

  const capped = range === 'month' ? series.slice(-6) : range === 'year' ? series.slice(-12) : series.slice(-31)

  return capped.map((b) => ({
    label: labelFor(b.key, b.date),
    events: b.events,
    failed: b.failed,
    anomalies: b.anomalies,
  }))
}

// Aggregates events by country with failure counts and a simple risk tier,
// for the interactive world map + ranked country table.
export function aggregateCountryStats(events, topN = 5) {
  const byCountry = new Map()

  for (const ev of events) {
    const geo = ev.geo || {}
    const country = geo.country
    if (!country || country === 'Unknown') continue

    if (!byCountry.has(country)) {
      byCountry.set(country, {
        country,
        code: geo.country_code,
        lat: geo.latitude,
        lon: geo.longitude,
        events: 0,
        failed: 0,
      })
    }
    const bucket = byCountry.get(country)
    bucket.events += 1
    if ((ev.status || '').toLowerCase() === 'failed') bucket.failed += 1
  }

  const rows = Array.from(byCountry.values()).map((r) => {
    const failRatio = r.events ? r.failed / r.events : 0
    const risk = failRatio >= 0.5 ? 'High' : failRatio > 0 ? 'Medium' : 'Low'
    return { ...r, risk }
  })

  const sorted = rows.sort((a, b) => b.events - a.events)
  const top = sorted.slice(0, topN)
  const othersCount = sorted.slice(topN).reduce((sum, c) => sum + c.events, 0)
  const maxEvents = Math.max(1, ...sorted.map((c) => c.events))

  return { top, others: othersCount, maxEvents, all: sorted }
}
