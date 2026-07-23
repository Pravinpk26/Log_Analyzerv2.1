import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchAIInsights,
  fetchDashboardSummary,
  resetSession,
  scanUrl,
  uploadLogFile,
} from '../lib/api'

const POLL_INTERVAL_MS = 15000

function eventKey(ev) {
  if (!ev) return null
  return `${ev.timestamp || ''}|${ev.ip_address || ''}`
}

function extFromName(name = '') {
  const lower = name.toLowerCase()
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.csv')) return 'csv'
  return 'other'
}

export function useDashboardData(pollIntervalMs = POLL_INTERVAL_MS) {
  const [summary, setSummary] = useState(null) // raw /dashboard payload
  const [lastScan, setLastScan] = useState(null) // raw /scan payload
  const [aiInsights, setAiInsights] = useState(null) // raw /ai-insights (or /scan.ai_insights) payload
  const [anomalyLog, setAnomalyLog] = useState([]) // [{ timestamp, ip, country, browser, anomalies }]
  const [sourceCounts, setSourceCounts] = useState({ live: 0, json: 0, csv: 0 })
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [lastFile, setLastFile] = useState(null)
  const [lastScanTarget, setLastScanTarget] = useState('')

  const pollRef = useRef(null)
  const lastProcessedEventKey = useRef(null)

  // Single place that decides whether a newly-seen latest event's anomalies
  // get appended to the session anomaly log. Used by BOTH the scan path and
  // the polling/refresh path, keyed on (timestamp + ip) so the same event
  // is never double-counted (fixes: anomaly log only updating after a live
  // scan, and KPI vs. chart drifting apart from double-counting).
  const maybeRecordAnomalies = useCallback((latestEvent, anomalies) => {
    if (!latestEvent || !anomalies || anomalies.length === 0) return
    const key = eventKey(latestEvent)
    if (!key || key === lastProcessedEventKey.current) return
    lastProcessedEventKey.current = key
    setAnomalyLog((prev) => [
      ...prev,
      {
        timestamp: latestEvent.timestamp || new Date().toISOString(),
        ip: latestEvent.ip_address || 'Unknown',
        country: latestEvent?.geo?.country || 'Unknown',
        browser: latestEvent.browser || 'Unknown',
        anomalies,
      },
    ])
  }, [])

  const refreshAiInsights = useCallback(
    async (latestEventHint) => {
      try {
        const data = await fetchAIInsights()
        setAiInsights(data)
        if (latestEventHint) {
          maybeRecordAnomalies(latestEventHint, data?.anomalies)
        }
      } catch {
        // Non-fatal — the AI panel just falls back to client-side derivation.
      }
    },
    [maybeRecordAnomalies]
  )

  const refresh = useCallback(async () => {
    try {
      const data = await fetchDashboardSummary()
      setSummary(data)
      setConnected(true)
      setError(null)
      const events = data?.events || []
      const latestEvent = events[events.length - 1]
      // Bug fix: previously the anomaly log only grew after a live /scan.
      // Now every refresh (poll, post-upload, manual reload) also checks
      // whether the latest known event has anomalies worth recording.
      await refreshAiInsights(latestEvent)
    } catch (err) {
      setConnected(false)
      setError(err.message || 'Could not reach the backend.')
    } finally {
      setLoading(false)
    }
  }, [refreshAiInsights])

  useEffect(() => {
    refresh()
    pollRef.current = setInterval(refresh, pollIntervalMs)
    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, pollIntervalMs])

  const runScan = useCallback(
    async (url) => {
      if (uploading) throw new Error('An upload is already in progress. Wait for it to finish before scanning.')
      setScanning(true)
      setError(null)
      setLastScanTarget(url)
      try {
        const data = await scanUrl(url)
        setLastScan(data)
        if (data?.ai_insights) setAiInsights(data.ai_insights)
        maybeRecordAnomalies(data?.authentication_event, data?.anomalies)
        setSourceCounts((prev) => ({ ...prev, live: prev.live + 1 }))
        await refresh()
        return data
      } catch (err) {
        setError(err.message || 'Scan failed.')
        throw err
      } finally {
        setScanning(false)
      }
    },
    [refresh, uploading, maybeRecordAnomalies]
  )

  const runUpload = useCallback(
    async (file, onProgress) => {
      if (scanning) throw new Error('A scan is already running. Wait for it to finish before uploading.')
      setUploading(true)
      setError(null)
      try {
        const data = await uploadLogFile(file, onProgress)
        const kind = extFromName(file.name)
        setLastFile({ name: file.name, size: file.size, kind, uploadedAt: new Date().toISOString(), ...data })
        setSourceCounts((prev) => ({
          ...prev,
          json: prev.json + (kind === 'json' ? data.events_imported || 0 : 0),
          csv: prev.csv + (kind === 'csv' ? data.events_imported || 0 : 0),
        }))
        await refresh()
        return data
      } catch (err) {
        setError(err.message || 'Upload failed.')
        throw err
      } finally {
        setUploading(false)
      }
    },
    [refresh, scanning]
  )

  const reset = useCallback(async () => {
    setResetting(true)
    setError(null)
    try {
      await resetSession()
      setAnomalyLog([])
      setSourceCounts({ live: 0, json: 0, csv: 0 })
      setLastScan(null)
      setAiInsights(null)
      setLastFile(null)
      setLastScanTarget('')
      lastProcessedEventKey.current = null
      await refresh()
    } catch (err) {
      setError(err.message || 'Reset failed.')
      throw err
    } finally {
      setResetting(false)
    }
  }, [refresh])

  return {
    summary,
    events: summary?.events || [],
    lastScan,
    lastScanTarget,
    aiInsights,
    anomalyLog,
    sourceCounts,
    loading,
    scanning,
    uploading,
    resetting,
    error,
    connected,
    lastFile,
    runScan,
    runUpload,
    reset,
    refresh,
  }
}
