import { Link } from 'react-router-dom'
import { Sparkles, Search, ShieldAlert, Lightbulb, ArrowRight, Gauge } from 'lucide-react'

// Fallback used only if the backend's /ai-insights (or /scan.ai_insights) is
// unreachable — keeps the panel useful even if that endpoint isn't wired up.
function buildFallbackInsights(anomalyRows, ipRows) {
  const insights = []

  const topAnomaly = anomalyRows[0]
  if (topAnomaly) {
    insights.push({
      category: topAnomaly.type,
      severity: topAnomaly.severity,
      confidence: null,
      observation: `${topAnomaly.count} occurrence${topAnomaly.count === 1 ? '' : 's'} of "${topAnomaly.type}" detected.`,
      risk: topAnomaly.message,
      recommendation:
        topAnomaly.severity === 'High'
          ? 'Consider rate limiting the affected login endpoint and reviewing recent access logs.'
          : 'Keep monitoring — escalate if the frequency increases over the next few scans.',
    })
  }

  const topIp = ipRows[0]
  if (topIp && topIp.score >= 50) {
    insights.push({
      category: 'Suspicious IP',
      severity: topIp.score >= 80 ? 'High' : 'Medium',
      confidence: null,
      observation: `IP ${topIp.ip} (${topIp.country}) generated ${topIp.total} event${topIp.total === 1 ? '' : 's'}.`,
      risk: `Derived risk score of ${topIp.score}/100 based on failure ratio and volume.`,
      recommendation: 'Consider blocking or challenging this IP with a CAPTCHA on repeat failures.',
    })
  }

  if (insights.length === 0) {
    insights.push({
      category: 'Baseline',
      severity: 'Low',
      confidence: null,
      observation: 'No anomalies or suspicious IPs have been observed yet.',
      risk: 'No elevated risk identified at this time.',
      recommendation: 'Run a scan or upload a log file to generate the first round of insights.',
    })
  }

  return insights
}

const SEVERITY_TEXT = {
  High: 'text-brand-red',
  Medium: 'text-brand-amber',
  Low: 'text-brand-green',
}

export default function AIInsights({ aiInsights, anomalyRows, ipRows, limit = 3, showViewReport = true }) {
  const usingBackend = Boolean(aiInsights?.insights?.length)
  const insights = usingBackend ? aiInsights.insights : buildFallbackInsights(anomalyRows, ipRows)
  const visible = insights.slice(0, limit)

  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-brand-primary" />
          <p className="text-[14px] font-semibold text-ink">AI Insights &amp; Recommendations</p>
        </div>
        {usingBackend && (
          <span className="flex items-center gap-1 text-[11px] text-ink-faint">
            <Gauge size={12} />
            {aiInsights.confidence_score}% confidence
          </span>
        )}
      </div>

      {usingBackend && (
        <p className="text-[11.5px] text-ink-faint leading-relaxed mb-3 pb-3 border-b border-panel-border">
          {aiInsights.overall_summary}
        </p>
      )}

      <div className="flex flex-col gap-4 flex-1">
        {visible.map((item, i) => (
          <div key={item.id || i} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <span className={`tag ${SEVERITY_TEXT[item.severity] || 'text-ink-muted'} bg-panel-soft`}>
                {item.category}
              </span>
              {item.confidence != null && (
                <span className="text-[10.5px] text-ink-faint shrink-0">{item.confidence}% confidence</span>
              )}
            </div>
            <div className="flex gap-2">
              <Search size={13} className="text-brand-primary mt-0.5 shrink-0" />
              <p className="text-[12px] text-ink-muted leading-relaxed">
                <span className="text-ink-faint font-medium">Observation: </span>
                {item.observation}
              </p>
            </div>
            <div className="flex gap-2">
              <ShieldAlert size={13} className="text-brand-amber mt-0.5 shrink-0" />
              <p className="text-[12px] text-ink-muted leading-relaxed">
                <span className="text-ink-faint font-medium">Risk: </span>
                {item.risk}
              </p>
            </div>
            <div className="flex gap-2">
              <Lightbulb size={13} className="text-brand-green mt-0.5 shrink-0" />
              <p className="text-[12px] text-ink-muted leading-relaxed">
                <span className="text-ink-faint font-medium">Recommendation: </span>
                {item.recommendation}
              </p>
            </div>
            {i < visible.length - 1 && <div className="h-px bg-panel-border mt-1" />}
          </div>
        ))}
      </div>

      {showViewReport && (
        <Link
          to="/reports"
          className="mt-4 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-brand-primary/15 text-brand-primary text-[12.5px] font-semibold hover:bg-brand-primary/25 transition-colors"
        >
          View Full Report
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  )
}
