import { Activity, ShieldAlert, KeyRound, Globe2 } from 'lucide-react'

function tierFromScore(score) {
  if (score >= 80) return { label: 'Low Risk', color: 'text-brand-green', ring: '#22c55e' }
  if (score >= 50) return { label: 'Medium Risk', color: 'text-brand-amber', ring: '#FBBF24' }
  return { label: 'High Risk', color: 'text-brand-red', ring: '#ef4444' }
}

export default function KpiCards({ totalEvents, anomalyCount, failedLogins, uniqueIps, securityScore, sparklines }) {
  const tier = tierFromScore(securityScore)
  const circumference = 2 * Math.PI * 34
  const dash = (securityScore / 100) * circumference

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <MetricCard
        icon={Activity}
        iconClass="text-brand-primary bg-brand-primary/15"
        label="Total Events"
        value={totalEvents.toLocaleString()}
        spark={sparklines?.events}
        sparkColor="#FF6B35"
      />
      <MetricCard
        icon={ShieldAlert}
        iconClass="text-brand-red bg-brand-red/15"
        label="Anomalies Detected"
        value={anomalyCount.toLocaleString()}
        valueClass="text-brand-red"
        spark={sparklines?.anomalies}
        sparkColor="#ef4444"
      />
      <MetricCard
        icon={KeyRound}
        iconClass="text-brand-amber bg-brand-amber/15"
        label="Failed Logins"
        value={failedLogins.toLocaleString()}
        valueClass="text-brand-amber"
        spark={sparklines?.failed}
        sparkColor="#FBBF24"
      />
      <MetricCard
        icon={Globe2}
        iconClass="text-brand-cyan bg-brand-cyan/15"
        label="Unique IPs"
        value={uniqueIps.toLocaleString()}
        valueClass="text-brand-cyan"
        spark={sparklines?.uniqueIps}
        sparkColor="#38bdf8"
      />

      <div className="card px-5 py-4 flex items-center gap-4 col-span-2 md:col-span-1 xl:col-span-1">
        <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0 -rotate-90">
          <circle cx="38" cy="38" r="34" fill="none" stroke="#333333" strokeWidth="7" />
          <circle
            cx="38"
            cy="38"
            r="34"
            fill="none"
            stroke={tier.ring}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
          <text
            x="38"
            y="38"
            textAnchor="middle"
            dominantBaseline="central"
            transform="rotate(90 38 38)"
            fontSize="18"
            fontWeight="800"
            fill="#f1efec"
          >
            {securityScore}
          </text>
        </svg>
        <div>
          <p className="text-[11px] text-ink-faint mb-1">Security Score</p>
          <p className={`text-[13px] font-bold ${tier.color}`}>{tier.label}</p>
          <p className="text-[11px] text-ink-faint">/100 · higher is safer</p>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, iconClass, label, value, valueClass = 'text-ink', spark, sparkColor }) {
  return (
    <div className="card px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-medium text-ink-muted">{label}</p>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${iconClass}`}>
          <Icon size={14} />
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className={`text-2xl font-extrabold tracking-tight ${valueClass}`}>{value}</p>
        <Sparkline values={spark} color={sparkColor} />
      </div>
    </div>
  )
}

// Real-history sparkline. Hides gracefully (renders nothing) if there's
// fewer than 2 days of data — never fabricates a trend.
function Sparkline({ values, color }) {
  if (!values || values.length < 2) return null

  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const w = 56
  const h = 22
  const step = w / (values.length - 1)

  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ')

  return (
    <svg width={w} height={h} className="shrink-0 opacity-90">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
