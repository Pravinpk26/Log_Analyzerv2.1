import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, Eye, EyeOff, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DEMO_CREDENTIALS } from '../services/authService'

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    const dest = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={dest} replace />
  }

  function validate() {
    const next = {}
    if (!username.trim()) next.username = 'Username is required.'
    if (!password) next.password = 'Password is required.'
    else if (password.length < 4) next.password = 'Password must be at least 4 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    if (!validate()) return

    setLoading(true)
    try {
      await login(username, password, remember)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (err) {
      setSubmitError(err.message || 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  function fillDemo() {
    setUsername(DEMO_CREDENTIALS.username)
    setPassword(DEMO_CREDENTIALS.password)
    setErrors({})
    setSubmitError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center mb-4">
            <ShieldCheck size={26} className="text-brand-primary" />
          </div>
          <h1 className="text-xl font-bold text-ink">Log Analyzer</h1>
          <p className="text-[13px] text-ink-faint mt-1">Mini SOC Dashboard — Authentication Security Monitoring</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-7" noValidate>
          <h2 className="text-[15px] font-semibold text-ink mb-1">Sign in to your account</h2>
          <p className="text-[12px] text-ink-faint mb-5">Enter your credentials to access the dashboard.</p>

          {submitError && (
            <div className="flex items-center gap-2 bg-brand-red/10 border border-brand-red/30 rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle size={14} className="text-brand-red shrink-0" />
              <p className="text-[12px] text-brand-red">{submitError}</p>
            </div>
          )}

          <Field label="Username" error={errors.username}>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className={inputClass(errors.username)}
            />
          </Field>

          <Field label="Password" error={errors.password}>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputClass(errors.password)} pr-9`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 text-[12.5px] text-ink-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-brand-primary"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() =>
                alert('Password reset isn\u2019t wired up yet \u2014 this is a demo/mock authentication flow.')
              }
              className="text-[12.5px] text-brand-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-[13.5px] font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="mt-5 pt-5 border-t border-panel-border">
            <div className="flex items-start gap-2 bg-panel-soft border border-panel-border rounded-lg px-3 py-2.5">
              <Info size={14} className="text-brand-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11.5px] text-ink-muted leading-relaxed">
                  <span className="font-semibold text-ink">Demo credentials:</span>{' '}
                  <code className="text-brand-primary">{DEMO_CREDENTIALS.username}</code> /{' '}
                  <code className="text-brand-primary">{DEMO_CREDENTIALS.password}</code>
                </p>
                <button
                  type="button"
                  onClick={fillDemo}
                  className="text-[11.5px] text-brand-primary hover:underline mt-1"
                >
                  Fill demo credentials
                </button>
              </div>
            </div>
          </div>
        </form>

        <p className="text-center text-[11px] text-ink-faint mt-5">
          Authentication is currently mocked for this demo build.{' '}
          <span className="font-mono">// TODO: Backend Integration Required</span> for real login.
        </p>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] font-medium text-ink-muted mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[11.5px] text-brand-red mt-1">{error}</p>}
    </div>
  )
}

function inputClass(error) {
  return `w-full bg-panel border rounded-lg px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 ${
    error ? 'border-brand-red focus:ring-brand-red/60' : 'border-panel-border focus:ring-brand-primary/60'
  }`
}
