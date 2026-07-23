import { createContext, useContext } from 'react'
import { useDashboardData } from '../hooks/useDashboardData'
import { useSettings } from './SettingsContext'

// Single source of truth for the entire app. Every page consumes THIS
// context instead of calling useDashboardData() (or recomputing metrics)
// independently — that duplication was the root cause of KPI/chart/AI/
// report widgets disagreeing with each other.
const DashboardDataContext = createContext(null)

export function DashboardDataProvider({ children }) {
  const { settings } = useSettings()
  const data = useDashboardData(settings.pollIntervalMs)
  return <DashboardDataContext.Provider value={data}>{children}</DashboardDataContext.Provider>
}

export function useDashboardDataContext() {
  const ctx = useContext(DashboardDataContext)
  if (!ctx) throw new Error('useDashboardDataContext must be used within a DashboardDataProvider')
  return ctx
}
