"""
Real threat-detection engine for the 7 account-compromise red flags.

Unlike the legacy anomaly_detector.py (which mostly checked whether a
flag like `impossible_travel` was already `True` in the incoming data —
a flag nothing ever actually set), everything here is *computed* from
the account's real login history: geo-distance/time math for impossible
travel, a running set of previously-seen browsers for device
recognition, timestamp-hour checks for odd-hours logins, and the
proxy/hosting reputation returned by GeoService for suspicious IPs.

Each finding carries:
  - severity        ("Low" | "Medium" | "High")
  - confidence       (0-100 — how sure the engine is this is a genuine
                       positive, not a coincidence/data artifact)
  - MITRE ATT&CK mapping (tactic, technique id/name, and why it applies)
"""

import math
from datetime import datetime

from services.mitre_mapping import get_mitre_mapping

# Quiet hours during which a login is treated as behaviorally unusual.
# (Configurable — 00:00-05:00 covers typical overnight hours regardless
# of exact personal schedule; tighten/loosen as needed.)
NIGHT_START_HOUR = 0
NIGHT_END_HOUR = 5

# A commercial flight cruises at ~800-900 km/h. Anything that *requires*
# faster travel than this between two logins is physically impossible.
IMPOSSIBLE_TRAVEL_MIN_KMH = 900

# Ignore small distances — IP geolocation itself jitters by tens of km,
# so don't flag "impossible travel" over noise.
MIN_IMPOSSIBLE_TRAVEL_DISTANCE_KM = 300

PASSWORD_RESET_WINDOW_HOURS = 24
PASSWORD_RESET_THRESHOLD = 2  # 2+ requests in the window triggers the flag


def _parse_timestamp(ts):
    if not ts:
        return None
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%SZ",
    ):
        try:
            return datetime.strptime(ts, fmt)
        except (ValueError, TypeError):
            continue
    return None


def _haversine_km(lat1, lon1, lat2, lon2):
    try:
        lat1, lon1, lat2, lon2 = (float(lat1), float(lon1), float(lat2), float(lon2))
    except (TypeError, ValueError):
        return None

    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _identity_key(event):
    """Group history by username when known, else fall back to IP."""
    username = event.get("username")
    if username and username != "Unknown":
        return f"user:{username}"
    ip = event.get("ip_address")
    return f"ip:{ip}" if ip else None


def _finding(anomaly_type, severity, confidence, message, event):
    mitre = get_mitre_mapping(anomaly_type)
    return {
        "type": anomaly_type,
        "severity": severity,
        "confidence": confidence,
        "message": message,
        "ip_address": event.get("ip_address", "Unknown"),
        "username": event.get("username", "Unknown"),
        "timestamp": event.get("timestamp"),
        "mitre_tactic": mitre["tactic"],
        "mitre_technique_id": mitre["technique_id"],
        "mitre_technique_name": mitre["technique_name"],
        "mitre_rationale": mitre["why"],
    }


def detect_threats(history, latest_event):
    """
    Runs all 7 red-flag detectors against `latest_event`, using the same
    identity's prior events in `history` (which should include
    `latest_event` itself) as the baseline for comparison.

    Returns a list of finding dicts (possibly empty).
    """

    findings = []
    if not latest_event:
        return findings

    key = _identity_key(latest_event)
    prior_events = [
        e for e in history
        if e is not latest_event and _identity_key(e) == key
    ]

    latest_geo = latest_event.get("geo") or {}
    latest_ts = _parse_timestamp(latest_event.get("timestamp"))

    # ------------------------------------------------------------
    # 1. Impossible Travel
    # ------------------------------------------------------------
    if latest_geo.get("latitude") is not None and latest_ts:
        prior_sorted = sorted(
            prior_events,
            key=lambda e: e.get("timestamp") or "",
            reverse=True,
        )
        for prior in prior_sorted:
            prior_geo = prior.get("geo") or {}
            prior_ts = _parse_timestamp(prior.get("timestamp"))
            if prior_geo.get("latitude") is None or not prior_ts:
                continue

            hours = abs((latest_ts - prior_ts).total_seconds()) / 3600
            if hours == 0:
                continue

            distance_km = _haversine_km(
                latest_geo["latitude"], latest_geo["longitude"],
                prior_geo["latitude"], prior_geo["longitude"],
            )
            if distance_km is None or distance_km < MIN_IMPOSSIBLE_TRAVEL_DISTANCE_KM:
                break

            required_speed = distance_km / hours
            if required_speed > IMPOSSIBLE_TRAVEL_MIN_KMH:
                findings.append(_finding(
                    "Impossible Travel", "High", 92,
                    f"Login from {latest_geo.get('city', 'Unknown')}, "
                    f"{latest_geo.get('country', 'Unknown')} occurred {hours:.1f}h after a login "
                    f"from {prior_geo.get('city', 'Unknown')}, {prior_geo.get('country', 'Unknown')} "
                    f"— {distance_km:.0f} km apart, requiring ~{required_speed:.0f} km/h of travel.",
                    latest_event,
                ))
            break  # only ever compare against the most recent prior event

    # ------------------------------------------------------------
    # 2. Unrecognized Device / Browser
    # ------------------------------------------------------------
    known_browsers = {(e.get("browser") or "Unknown") for e in prior_events}
    current_browser = latest_event.get("browser") or "Unknown"
    if prior_events and current_browser != "Unknown" and current_browser not in known_browsers:
        seen = ", ".join(sorted(b for b in known_browsers if b != "Unknown")) or "none recorded"
        findings.append(_finding(
            "Unrecognized Device", "Medium", 78,
            f"This login used '{current_browser}', not previously seen on this account "
            f"(previously seen: {seen}).",
            latest_event,
        ))

    # ------------------------------------------------------------
    # 3. Odd Timestamp
    # ------------------------------------------------------------
    if latest_ts and NIGHT_START_HOUR <= latest_ts.hour < NIGHT_END_HOUR:
        findings.append(_finding(
            "Odd Timestamp", "Medium", 65,
            f"Authentication occurred at {latest_ts.strftime('%H:%M')}, inside the "
            f"{NIGHT_START_HOUR:02d}:00\u2013{NIGHT_END_HOUR:02d}:00 quiet-hours window.",
            latest_event,
        ))

    # ------------------------------------------------------------
    # 4. Unsolicited MFA Prompt
    #    (only meaningful for logs that carry explicit MFA-prompt events —
    #    optional fields, safe no-op if absent)
    # ------------------------------------------------------------
    if latest_event.get("mfa_prompted") and not latest_event.get("login_attempt_active"):
        findings.append(_finding(
            "Unsolicited MFA Prompt", "High", 85,
            "An MFA push/code was sent without a matching active login attempt in this session.",
            latest_event,
        ))

    # ------------------------------------------------------------
    # 5. Repeated Password Resets
    # ------------------------------------------------------------
    if latest_event.get("event_type") == "password_reset_request" and latest_ts:
        recent_resets = [
            e for e in prior_events
            if e.get("event_type") == "password_reset_request"
            and _parse_timestamp(e.get("timestamp"))
            and abs((latest_ts - _parse_timestamp(e.get("timestamp"))).total_seconds())
            <= PASSWORD_RESET_WINDOW_HOURS * 3600
        ]
        total = len(recent_resets) + 1
        if total >= PASSWORD_RESET_THRESHOLD:
            findings.append(_finding(
                "Repeated Password Resets", "High", 80,
                f"{total} password-reset requests for this account within "
                f"{PASSWORD_RESET_WINDOW_HOURS}h.",
                latest_event,
            ))

    # ------------------------------------------------------------
    # 6. Disabled Security Controls
    # ------------------------------------------------------------
    if latest_event.get("event_type") == "security_setting_changed":
        details = latest_event.get("details") or {}
        if details.get("mfa_disabled") or details.get("login_alerts_disabled"):
            findings.append(_finding(
                "Disabled Security Controls", "High", 90,
                "MFA or login-notification settings were turned off for this account.",
                latest_event,
            ))

    # ------------------------------------------------------------
    # 7. Suspicious IP Address (proxy / anonymizing network / hosting range)
    # ------------------------------------------------------------
    if latest_geo.get("is_proxy") or latest_geo.get("is_hosting"):
        is_proxy = bool(latest_geo.get("is_proxy"))
        kind = "proxy/anonymizing network" if is_proxy else "datacenter/hosting range"
        findings.append(_finding(
            "Suspicious IP Address",
            "High" if is_proxy else "Medium",
            88 if is_proxy else 74,
            f"Login originated from {latest_event.get('ip_address', 'Unknown')}, identified as a "
            f"{kind} ({latest_geo.get('isp', 'Unknown')}) rather than a residential/business network.",
            latest_event,
        ))

    return findings
