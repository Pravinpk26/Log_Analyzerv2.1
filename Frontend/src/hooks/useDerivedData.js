import { useMemo, useState } from 'react'
import { useDashboardDataContext } from '../context/DashboardDataContext'
import {
  aggregateAnomalies,
  aggregateByBrowser,
  aggregateByCity,
  aggregateByIp,
  aggregateCountryStats,
  buildKpiSparklines,
  buildTimeSeries,
  computeCanonicalRisk,
  flattenAlerts,
} from '../lib/derive'

/**
 * The ONE place every page pulls computed metrics from. Nothing outside of
 * derive.js (pure functions) and this hook (wiring) should be doing its own
 * math on raw events/anomalies — that's what caused the KPI/chart/AI/report
 * inconsistencies this build fixes.
 *
 * `timeRange` controls the Event Overview granularity ('day' | 'week' |
 * 'month' | 'year') and defaults to 'week'; pass a different value from
 * whichever page owns the range dropdown.
 */
export function useDerivedData(timeRange = 'week') {
  const ctx = useDashboardDataContext()
  const { summary, events, lastScan, anomalyLog, sourceCounts } = ctx

  const statistics = useMemo(
    () => ({
      total_logins: summary?.total_events ?? 0,
      successful_logins: summary?.successful_logins ?? 0,
      failed_logins: summary?.failed_logins ?? 0,
      unique_ips: summary?.unique_ips ?? 0,
    }),
    [summary]
  )

  const timeSeries = useMemo(() => buildTimeSeries(events, anomalyLog, timeRange), [events, anomalyLog, timeRange])
  const sparklines = useMemo(() => buildKpiSparklines(events, anomalyLog), [events, anomalyLog])
  const browserBreakdown = useMemo(() => aggregateByBrowser(events), [events])
  const countryStats = useMemo(() => aggregateCountryStats(events), [events])
  const cityStats = useMemo(() => aggregateByCity(events), [events])
  const ipRows = useMemo(() => aggregateByIp(events), [events])
  const anomalyRows = useMemo(() => aggregateAnomalies(anomalyLog, 10), [anomalyLog])
  const alertRows = useMemo(() => flattenAlerts(anomalyLog), [anomalyLog])
  const risk = useMemo(() => computeCanonicalRisk(statistics, lastScan?.risk), [statistics, lastScan])

  const anomalyCount = useMemo(
    () => anomalyLog.reduce((sum, e) => sum + e.anomalies.length, 0),
    [anomalyLog]
  )

  const severityCounts = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 }
    for (const entry of anomalyLog) {
      for (const a of entry.anomalies) counts[a.severity] = (counts[a.severity] || 0) + 1
    }
    return counts
  }, [anomalyLog])

  const eventSourceBreakdown = useMemo(
    () => [
      { name: 'Live Monitoring', value: sourceCounts.live },
      { name: 'JSON Upload', value: sourceCounts.json },
      { name: 'CSV Upload', value: sourceCounts.csv },
    ].filter((s) => s.value > 0),
    [sourceCounts]
  )

  return {
    ...ctx,
    statistics,
    totalEvents: statistics.total_logins,
    failedLogins: statistics.failed_logins,
    successfulLogins: statistics.successful_logins,
    uniqueIps: statistics.unique_ips,
    anomalyCount,
    severityCounts,
    timeSeries,
    sparklines,
    browserBreakdown,
    countryStats,
    cityStats,
    ipRows,
    anomalyRows,
    alertRows,
    risk,
    eventSourceBreakdown,
  }
}

// Small local hook for pages that own an Event Overview range dropdown.
export function useTimeRange(initial = 'week') {
  const [range, setRange] = useState(initial)
  return [range, setRange]
}
