from datetime import datetime


# --------------------------------------------------------------------------
# Individual analyzers
# Each takes the shared context dict and returns an insight dict, or None.
# --------------------------------------------------------------------------

def _analyze_credential_attack(ctx):
    failed = ctx["statistics"].get("failed_logins", 0)

    if failed < 3:
        return None

    if failed >= 8:
        severity, confidence = "High", 97
        verdict = "a sustained brute-force pattern"
    elif failed >= 5:
        severity, confidence = "High", 88
        verdict = "a likely brute-force attempt"
    else:
        severity, confidence = "Medium", 70
        verdict = "early-stage credential probing"

    return {
        "id": "credential_attack",
        "category": "Credential Attack",
        "severity": severity,
        "confidence": confidence,
        "observation": f"{failed} failed login attempts have been recorded for this account.",
        "risk": f"This pattern is consistent with {verdict}, which can lead to account takeover.",
        "recommendation": (
            "Enable Multi-Factor Authentication, enforce account lockout or exponential "
            "back-off after repeated failures, and monitor the source IP."
        ),
    }


def _analyze_distributed_access(ctx):
    unique_ips = ctx["statistics"].get("unique_ips", 0)
    total = ctx["statistics"].get("total_logins", 0)

    if unique_ips < 3:
        return None

    ratio = unique_ips / total if total else 0
    if ratio > 0.7 and total >= 4:
        severity, confidence = "High", 85
        note = "almost every session arrives from a new IP"
    else:
        severity, confidence = "Medium", 65
        note = "activity is spread across more source IPs than typical single-user behavior"

    return {
        "id": "distributed_access",
        "category": "Network",
        "severity": severity,
        "confidence": confidence,
        "observation": f"{unique_ips} unique IP addresses have accessed this account, and {note}.",
        "risk": "This is a common signature of credential-stuffing tooling or a shared/compromised credential.",
        "recommendation": (
            "Correlate these IPs against known proxy/VPN/datacenter ranges and enable "
            "geo-velocity (impossible-travel) checks."
        ),
    }


def _analyze_multi_country(ctx):
    events = ctx.get("events") or []
    countries = {
        (e.get("geo") or {}).get("country")
        for e in events
        if (e.get("geo") or {}).get("country") not in (None, "Unknown")
    }

    if len(countries) < 2:
        return None

    severity = "High" if len(countries) >= 4 else "Medium"
    return {
        "id": "multi_country",
        "category": "Geolocation",
        "severity": severity,
        "confidence": 75,
        "observation": (
            f"Authentication activity for this account has originated from {len(countries)} "
            f"different countries ({', '.join(sorted(countries))})."
        ),
        "risk": "Logins from multiple geographic regions in a short window often indicate account sharing or compromise.",
        "recommendation": "Review account activity for signs of account sharing or compromise, and confirm recent logins with the account owner.",
    }


def _analyze_geo_signal(ctx):
    event = ctx["authentication_event"] or {}
    geo = event.get("geo", {}) or {}
    country = geo.get("country", "Unknown")
    isp = geo.get("isp") or geo.get("organization")

    if not country or country == "Unknown":
        return None

    hosting_markers = ["hosting", "cloud", "data center", "datacenter", "vps", "server"]
    looks_like_hosting = bool(isp) and any(m in isp.lower() for m in hosting_markers)

    if looks_like_hosting:
        return {
            "id": "hosting_origin",
            "category": "Network",
            "severity": "Medium",
            "confidence": 72,
            "observation": (
                f"The latest login originated from {country} via {isp}, which looks like a "
                f"hosting/datacenter provider rather than a residential or mobile network."
            ),
            "risk": "Datacenter-origin logins are frequently associated with automated tooling rather than genuine users.",
            "recommendation": "Treat datacenter-origin logins as higher risk by default and consider step-up authentication for this traffic class.",
        }

    return {
        "id": "geo_context",
        "category": "Geolocation",
        "severity": "Low",
        "confidence": 60,
        "observation": f"Latest authentication event originated from {country}.",
        "risk": "Low risk on its own, but relevant context if this country is unusual for the account.",
        "recommendation": "If this country is unusual for this account's normal usage pattern, flag it for manual review.",
    }


def _analyze_temporal_signal(ctx):
    event = ctx["authentication_event"] or {}
    timestamp = event.get("timestamp", "")

    try:
        hour = int(timestamp.split(" ")[1].split(":")[0])
    except Exception:
        return None

    if hour < 6 or hour >= 22:
        return {
            "id": "off_hours_login",
            "category": "Behavioral",
            "severity": "Medium",
            "confidence": 68,
            "observation": f"Authentication occurred at {hour:02d}:00, outside typical business hours (08:00-20:00).",
            "risk": "Off-hours logins aren't inherently malicious, but combined with other signals they raise confidence in a compromised-credential scenario.",
            "recommendation": "Cross-reference off-hours logins with the account owner's known working pattern before treating this as routine.",
        }

    return None


def _analyze_performance_signal(ctx):
    event = ctx["authentication_event"] or {}
    response_time = event.get("response_time", 0) or 0

    if response_time <= 3000:
        return None

    severity = "High" if response_time > 10000 else "Low"
    return {
        "id": "latency_anomaly",
        "category": "Performance",
        "severity": severity,
        "confidence": 55,
        "observation": f"Authentication response time was {response_time} ms, well above the expected ~500-1500 ms range.",
        "risk": "Unusually slow auth responses can indicate infrastructure strain or automated tooling hammering the login form.",
        "recommendation": "Investigate infrastructure first (server load, DB latency, network path) before assuming malicious intent.",
    }


def _analyze_security_headers(ctx):
    signals = ctx.get("signals")
    if not signals:
        return None

    security = signals.get("security_signals", {}) or {}
    missing = []
    if not security.get("hsts_header_present"):
        missing.append("HSTS")
    if not security.get("csp_header_present"):
        missing.append("Content-Security-Policy")
    if not security.get("secure_cookies"):
        missing.append("Secure cookie flags")

    if not missing:
        return None

    severity = "High" if len(missing) >= 3 else "Medium"
    return {
        "id": "weak_headers",
        "category": "Security Headers",
        "severity": severity,
        "confidence": 80,
        "observation": f"The scanned login page is missing: {', '.join(missing)}.",
        "risk": "Weak security headers make the login page more vulnerable to XSS, clickjacking, and session-cookie theft.",
        "recommendation": "Improve security headers — add HSTS and a Content-Security-Policy, and mark session cookies Secure and HttpOnly.",
    }


def _analyze_healthy_state(ctx):
    """Fallback insight when nothing else fired, so the panel is never empty."""
    return {
        "id": "nominal",
        "category": "Baseline",
        "severity": "Low",
        "confidence": 90,
        "observation": "No significant anomalies detected in the current session data.",
        "risk": "No elevated risk identified at this time.",
        "recommendation": "Continue routine monitoring — no action required right now.",
    }


ANALYZERS = [
    _analyze_credential_attack,
    _analyze_distributed_access,
    _analyze_multi_country,
    _analyze_geo_signal,
    _analyze_temporal_signal,
    _analyze_performance_signal,
    _analyze_security_headers,
]


# --------------------------------------------------------------------------
# Narrative summary
# --------------------------------------------------------------------------

def _build_narrative_summary(insights, risk):
    if not insights:
        return "No meaningful signals detected yet. The environment appears nominal."

    high = [i for i in insights if i["severity"] == "High"]
    medium = [i for i in insights if i["severity"] == "Medium"]

    # risk_score here is a SECURITY score: higher = better/safer.
    security_score = (risk or {}).get("risk_score")
    score_note = f" Current security score is {security_score}/100." if security_score is not None else ""

    if high:
        lead = f"{len(high)} high-severity signal{'s' if len(high) != 1 else ''} detected.{score_note}"
    elif medium:
        lead = f"{len(medium)} medium-severity signal{'s' if len(medium) != 1 else ''} detected. Nothing critical yet, but worth watching.{score_note}"
    else:
        lead = f"Only low-severity signals detected.{score_note}"

    top = insights[0]
    return f"{lead} Top finding: {top['observation']}"


# --------------------------------------------------------------------------
# Public entrypoint
# --------------------------------------------------------------------------

def generate_ai_insights(statistics, anomalies=None, risk=None, authentication_event=None, events=None, signals=None):
    """
    Runs all analyzers against the current session context and returns a
    structured, ranked set of insights plus an overall narrative summary.

    `signals` is optional and only available right after a live /scan (it's
    the same dict signal_collector.collect_signals() produces) — passing it
    unlocks the security-header analyzer. Omit it (e.g. from the standalone
    /ai-insights endpoint) and that one analyzer simply won't fire.
    """
    ctx = {
        "statistics": statistics or {},
        "anomalies": anomalies or [],
        "risk": risk or {},
        "authentication_event": authentication_event or {},
        "events": events or [],
        "signals": signals,
    }

    insights = []
    for analyzer in ANALYZERS:
        result = analyzer(ctx)
        if result:
            insights.append(result)

    if not insights:
        insights.append(_analyze_healthy_state(ctx))

    severity_rank = {"High": 3, "Medium": 2, "Low": 1}
    insights.sort(key=lambda i: (severity_rank.get(i["severity"], 0), i["confidence"]), reverse=True)

    overall_confidence = round(sum(i["confidence"] for i in insights) / len(insights))

    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "overall_summary": _build_narrative_summary(insights, ctx["risk"]),
        "confidence_score": overall_confidence,
        "insight_count": len(insights),
        "insights": insights,
        # Raw anomalies passed straight through so callers that only hit
        # /ai-insights (not /scan) can still get at them if needed.
        "anomalies": ctx["anomalies"],
    }