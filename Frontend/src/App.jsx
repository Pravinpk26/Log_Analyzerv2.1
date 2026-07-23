import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { DashboardDataProvider } from './context/DashboardDataContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UploadLogsPage from './pages/UploadLogsPage'
import LogSourcesPage from './pages/LogSourcesPage'
import AlertsPage from './pages/AlertsPage'
import ThreatIntelPage from './pages/ThreatIntelPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import HelpPage from './pages/HelpPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <DashboardDataProvider>
                  <AppLayout />
                </DashboardDataProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/upload-logs" element={<UploadLogsPage />} />
            <Route path="/log-sources" element={<LogSourcesPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/threat-intel" element={<ThreatIntelPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SettingsProvider>
    </AuthProvider>
  )
}
