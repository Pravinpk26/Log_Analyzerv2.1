import {
  Radio,
  Lock,
  ShieldCheck,
  Cookie,
  Server,
  Clock,
  Repeat,
  FileText,
} from 'lucide-react'

export default function AuthenticationSignals({ results }) {
  if (!results) {
    return (
      <div className="card p-5">
        <p className="text-[14px] font-semibold text-ink mb-2">
          Authentication Signals
        </p>

        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ShieldCheck size={22} className="text-ink-faint mb-3" />

          <p className="text-[12px] text-ink-muted">
            No authentication signals available.
          </p>

          <p className="text-[11px] text-ink-faint mt-1">
            Run a live authentication scan to populate security signals.
          </p>
        </div>
      </div>
    )
  }

  const {
    network_signals = {},
    security_signals = {},
    authentication_signals = {},
  } = results

  return (
    <div className="card p-5">
      <p className="text-[14px] font-semibold text-ink mb-4">
        Authentication Signals
      </p>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">

        <Signal
          icon={Lock}
          label="HTTPS"
          value={<Badge ok={security_signals.https_enabled} />}
        />

        <Signal
          icon={ShieldCheck}
          label="HSTS Header"
          value={<Badge ok={security_signals.hsts_header_present} />}
        />

        <Signal
          icon={ShieldCheck}
          label="CSP Header"
          value={<Badge ok={security_signals.csp_header_present} />}
        />

        <Signal
          icon={Cookie}
          label="Secure Cookies"
          value={<Badge ok={security_signals.secure_cookies} />}
        />

        <Signal
          icon={Radio}
          label="TLS Version"
          value={network_signals.tls_version || 'Unknown'}
        />

        <Signal
          icon={Server}
          label="Server"
          value={network_signals.server_header || 'Unknown'}
        />

        <Signal
          icon={Repeat}
          label="Redirect Chain"
          value={`${network_signals.redirect_chain?.length ?? 0} hop(s)`}
        />

        <Signal
          icon={Clock}
          label="Response Time"
          value={
            network_signals.response_time_ms
              ? `${network_signals.response_time_ms} ms`
              : 'Unknown'
          }
        />

        <Signal
          icon={FileText}
          label="Content Length"
          value={network_signals.content_length ?? 'Unknown'}
        />

        <Signal
          icon={Radio}
          label="Protocol"
          value={network_signals.protocol || 'Unknown'}
        />

        <Signal
          icon={Lock}
          label="Login Method"
          value={
            authentication_signals.form_method ||
            (authentication_signals.login_form_detected ? 'POST' : 'N/A')
          }
        />

        <Signal
          icon={ShieldCheck}
          label="MFA Indicator"
          value={
            <Badge
              ok={authentication_signals.mfa_indicator}
              labelOn="Detected"
              labelOff="Not Detected"
            />
          }
        />
      </div>
    </div>
  )
}

function Signal({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-panel-border/60 py-1.5">
      <span className="flex items-center gap-2 text-[12px] text-ink-muted">
        <Icon size={13} className="text-ink-faint" />
        {label}
      </span>

      <span className="text-[12px] font-medium text-ink">
        {value}
      </span>
    </div>
  )
}

function Badge({
  ok,
  labelOn = 'Enabled',
  labelOff = 'Disabled',
}) {
  return (
    <span
      className={`tag ${
        ok
          ? 'bg-brand-green/15 text-brand-green'
          : 'bg-brand-red/15 text-brand-red'
      }`}
    >
      {ok ? labelOn : labelOff}
    </span>
  )
}