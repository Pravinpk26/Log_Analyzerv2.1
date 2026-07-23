import { useRef } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar'
import Topbar from '../Topbar'
import { useDashboardDataContext } from '../../context/DashboardDataContext'
import { useDerivedData } from '../../hooks/useDerivedData'

// Approved dashboard layout shell (Sidebar + Topbar), now reused across
// every authenticated page via <Outlet/> instead of being redefined per
// page. Scan/Upload/Reset controls live here so they're available and
// mutually-exclusive from anywhere in the app.
export default function AppLayout() {
  const { runScan, runUpload, reset, scanning, uploading, resetting, connected } = useDashboardDataContext()
  const { anomalyRows } = useDerivedData()
  const fileInputRef = useRef(null)

  async function handleScan(url) {
    try {
      await runScan(url)
    } catch {
      // surfaced via `error` state, shown on Dashboard
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await runUpload(file)
    } catch {
      // surfaced via `error` state
    } finally {
      e.target.value = ''
    }
  }

  async function handleReset() {
    if (!window.confirm('Reset the session? This clears all events, uploads, and scan history.')) return
    try {
      await reset()
    } catch {
      // surfaced via `error` state
    }
  }

  return (
    <div className="min-h-screen flex text-ink font-sans">
      <input ref={fileInputRef} type="file" accept=".json,.csv" className="hidden" onChange={handleFileChange} />

      <Sidebar alertCount={anomalyRows.length} connected={connected} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onScan={handleScan}
          onUploadClick={handleUploadClick}
          onReset={handleReset}
          scanning={scanning}
          uploading={uploading}
          resetting={resetting}
          connected={connected}
          alertCount={anomalyRows.length}
        />

        <main className="flex-1 px-6 py-6 flex flex-col gap-5 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
