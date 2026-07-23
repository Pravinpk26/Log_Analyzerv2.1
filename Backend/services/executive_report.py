"""
Builds the single consolidated "Executive Report" payload — this is what
backs the Executive Summary, Events Analyzed, Critical Alerts, High-Risk
IPs, Attack Timeline, Type of Attack, Top Error Types, Vulnerability
Indicators, Recommended Actions, and Overall Score sections of the
dashboard.

Deliberately does NOT recompute severities/confidences itself — it reads
the findings already produced by anomaly_detector.py and
threat_detection_engine.py so every number on the dashboard traces back
to exactly one formula, no matter which card is showing it.
"""

from datetime import datetime

from services.attack_classifier import classify_attack
from services.vulnerability_indicators import get_vulnerability_indicators


def _dedupe_recommendations(items):
    seen = set()
    ordered = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def build_executive_report(events, statistics, security_posture, anomalies, threats, signals=None, ai_insights=None):

    all_findings = (anomalies or []) + (threats or [])
    critical_alerts = [f for f in all_findings if f.get("severity") == "High"]

    # ------------------------------------------------------------
    # Top error / failure types
    # ------------------------------------------------------------
    error_counts = {}
    for e in events or []:
        reason = e.get("failure_reason") or (
            e.get("status") if e.get("status") not in (None, "Success", "") else None
        )
        if reason:
            error_counts[reason] = error_counts.get(reason, 0) + 1

    top_error_types = sorted(
        [{"type": k, "count": v} for k, v in error_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:5]

    # ------------------------------------------------------------
    # Attack timeline — chronological, across every finding with a timestamp
    # ------------------------------------------------------------
    timeline = sorted(
        [
            {
                "timestamp": f.get("timestamp"),
                "type": f.get("type"),
                "severity": f.get("severity"),
                "confidence": f.get("confidence"),
                "message": f.get("message"),
                "ip_address": f.get("ip_address"),
                "mitre_technique_id": f.get("mitre_technique_id"),
            }
            for f in all_findings
            if f.get("timestamp")
        ],
        key=lambda x: x["timestamp"] or "",
    )

    attack_type = classify_attack(threats, anomalies, statistics)
    vulnerabilities = get_vulnerability_indicators(signals, statistics, security_posture)

    high_risk_ips = sorted({
        f["ip_address"] for f in critical_alerts
        if f.get("ip_address") and f.get("ip_address") != "Unknown"
    })

    # ------------------------------------------------------------
    # Recommended actions — pulled from every source that already
    # generates one, deduplicated, most-severe findings' actions first.
    # ------------------------------------------------------------
    recommendations = []
    for f in sorted(critical_alerts, key=lambda x: x.get("confidence", 0), reverse=True):
        recommendations.append(f.get("mitre_rationale"))
    for insight in (ai_insights or {}).get("insights", []):
        recommendations.append(insight.get("recommendation"))
    for v in vulnerabilities:
        if v.get("severity") in ("High", "Medium"):
            recommendations.append(f"Fix: {v.get('indicator')} — {v.get('impact')}")

    recommended_actions = _dedupe_recommendations(recommendations)[:8]

    # ------------------------------------------------------------
    # Overall Score — canonical Security Score, penalized for unresolved
    # critical alerts. This is a distinct, clearly-labeled number from the
    # Security Score itself (see main.py's comments on why the two are
    # kept separate rather than silently disagreeing).
    # ------------------------------------------------------------
    base_score = security_posture.get("risk_score", 50) if security_posture else 50
    penalty = min(40, len(critical_alerts) * 10)
    overall_score = max(0, base_score - penalty)

    if overall_score >= 80:
        overall_risk_level = "Low"
    elif overall_score >= 50:
        overall_risk_level = "Medium"
    else:
        overall_risk_level = "High"

    executive_summary = (
        f"{len(events or [])} authentication event(s) analyzed. "
        f"{len(critical_alerts)} critical alert(s) identified out of {len(all_findings)} total finding(s). "
        f"Security score is {base_score}/100 "
        f"({(security_posture or {}).get('risk_level', 'Unknown')} risk). "
        f"Primary attack pattern: {attack_type['attack_type']}."
    )

    return {
        "executive_summary": executive_summary,
        "events_analyzed": len(events or []),
        "critical_alerts": {
            "count": len(critical_alerts),
            "items": critical_alerts,
        },
        "high_risk_ip_addresses": high_risk_ips,
        "failed_logins": statistics.get("failed_logins", 0) if statistics else 0,
        "attack_timeline": timeline,
        "attack_type": attack_type,
        "top_error_types": top_error_types,
        "vulnerability_indicators": vulnerabilities,
        "recommended_actions": recommended_actions,
        "overall_score": overall_score,
        "overall_risk_level": overall_risk_level,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
