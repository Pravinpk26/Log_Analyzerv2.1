import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { setApiBase, getApiBase } from '../lib/api'

const STORAGE_KEY = 'log_analyzer_settings'

const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  reducedMotion: false,
  pollIntervalMs: 15000,
  sessionTimeoutMins: 30,
  mfaRequired: false, // TODO: Backend Integration Required — no auth backend to enforce this yet
  apiBaseUrl: '',
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    document.body.classList.toggle('reduced-motion', settings.reducedMotion)
    if (settings.apiBaseUrl) setApiBase(settings.apiBaseUrl)
  }, [settings])

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    setApiBase('')
  }, [])

  return (
    <SettingsContext.Provider
      value={{ settings, updateSetting, resetSettings, effectiveApiBase: getApiBase() }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
