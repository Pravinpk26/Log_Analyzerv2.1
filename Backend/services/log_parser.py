import json
import csv

from services.geo_service import GeoService

# Simple in-memory cache so a log with many events from the same IP
# (e.g. one user's whole login history) doesn't re-hit ip-api.com's
# free-tier rate limit (45 req/min) for every single row.
_geo_lookup_cache = {}


def _lookup_geo(ip_address):
    if not ip_address or ip_address == "Unknown":
        return GeoService.empty_location(ip_address)

    if ip_address not in _geo_lookup_cache:
        _geo_lookup_cache[ip_address] = GeoService.get_location(ip_address)

    return _geo_lookup_cache[ip_address]


def _coerce_bool(value, default=False):
    """CSV rows arrive as strings ('True'/'false'/'1') — normalize them."""
    if isinstance(value, bool):
        return value
    if value is None or value == "":
        return default
    return str(value).strip().lower() in ("true", "1", "yes")


def _coerce_number(value, default=0):
    if value is None or value == "":
        return default
    try:
        return float(value) if "." in str(value) else int(value)
    except (ValueError, TypeError):
        return default


def normalize_event(event):
    """
    Converts uploaded authentication logs into the
    internal Authentication Event format used
    throughout the dashboard.

    Only `timestamp`, `username`/`email`, `ip_address`, `browser`, and
    `status` are actually required — everything else (geolocation,
    proxy/hosting reputation, etc.) is filled in automatically via
    GeoService when the log itself doesn't already provide it. This
    means a minimal log with no lat/long/city columns still gets full
    geo-based analysis (impossible travel, suspicious IP), the same way
    a live browser scan does.
    """

    # Fields the threat_detection_engine needs to actually compute the 7
    # red flags. These aren't guessed — if the uploaded log doesn't
    # provide them, they default to "no signal" rather than a fabricated
    # value, and the corresponding detector simply won't fire for this
    # event. Previously these were set with .setdefault() on the raw dict
    # in parse_json_log() but never copied into the normalized event, so
    # they were silently discarded before reaching the detection engine.
    intelligence_fields = {
        "event_type": event.get("event_type") or None,
        "mfa_prompted": _coerce_bool(event.get("mfa_prompted"), False),
        "login_attempt_active": _coerce_bool(event.get("login_attempt_active"), True),
        "details": event.get("details") or {},
        "failure_reason": event.get("failure_reason") or None,
    }

    ip_address = event.get("ip_address", "")

    # -----------------------------
    # Legacy Log (V1) / minimal CSV
    # -----------------------------

    if "geo" not in event:

        # A log is "sparse" if it didn't bother giving us city/lat itself
        # — in that case, look the IP up for real instead of defaulting
        # everything to "Unknown".
        has_explicit_geo = event.get("city") or event.get("latitude")
        looked_up = _lookup_geo(ip_address) if not has_explicit_geo else None

        def geo_field(key, fallback_key=None, default="Unknown"):
            if has_explicit_geo:
                return event.get(key, default)
            return looked_up.get(fallback_key or key, default)

        return {
            "event_id": event.get("event_id", "UNKNOWN"),
            "timestamp": event.get("timestamp", ""),
            "username": event.get("username", "Unknown"),
            "email": event.get("email", ""),
            "status": event.get("status", "Unknown"),
            "ip_address": ip_address,

            "browser": event.get("browser", "Unknown"),
            "response_time": _coerce_number(event.get("response_time"), 0),
            "session_cookie_count": _coerce_number(
                event.get("session_cookie_count"), 0
            ),

            "geo": {
                "city": geo_field("city"),
                "region": geo_field("region", "region"),
                "country": geo_field("country"),
                "latitude": event.get("latitude") if has_explicit_geo else looked_up.get("latitude"),
                "longitude": event.get("longitude") if has_explicit_geo else looked_up.get("longitude"),
                "isp": geo_field("isp"),
                "is_proxy": _coerce_bool(event.get("is_proxy")) if has_explicit_geo or "is_proxy" in event else (looked_up.get("is_proxy", False)),
                "is_hosting": _coerce_bool(event.get("is_hosting")) if has_explicit_geo or "is_hosting" in event else (looked_up.get("is_hosting", False)),
                "location_confidence": (looked_up or {}).get("location_confidence", 100 if has_explicit_geo else 0),
            },

            **intelligence_fields,
        }

    # -----------------------------
    # Enterprise Log (V2)
    # -----------------------------

    geo = event.get("geo", {})
    device = event.get("device", {})
    network = event.get("network", {})
    security = event.get("security", {})
    risk = event.get("risk", {})

    # geo may be present as a key but still incomplete (e.g. an enterprise
    # log that gives isp/city but no proxy/hosting flags, or no lat/long
    # at all) — fill in whatever's missing via a real IP lookup rather
    # than leaving it blank.
    looked_up = _lookup_geo(ip_address) if geo.get("latitude") is None else None

    def v2_geo_field(key, default=None):
        value = geo.get(key)
        if value not in (None, ""):
            return value
        return (looked_up or {}).get(key, default)

    return {

        "event_id": event.get("event_id"),

        "timestamp": event.get("timestamp"),

        "username": event.get("username"),

        "email": event.get("email"),

        "status": event.get("status"),

        "ip_address": ip_address,

        "browser": device.get(
            "browser",
            "Unknown"
        ),

        "response_time": network.get(
            "response_time",
            0
        ),

        "session_cookie_count": security.get(
            "session_cookie_count",
            0
        ),

        "geo": {

            "city": v2_geo_field("city", "Unknown"),

            "region": v2_geo_field("region", "Unknown"),

            "country": v2_geo_field("country", "Unknown"),

            "latitude": v2_geo_field("latitude"),

            "longitude": v2_geo_field("longitude"),

            "isp": v2_geo_field("isp", "Unknown"),

            "is_proxy": geo.get("is_proxy") if "is_proxy" in geo else (looked_up or {}).get("is_proxy", False),

            "is_hosting": geo.get("is_hosting") if "is_hosting" in geo else (looked_up or {}).get("is_hosting", False),

            "location_confidence": (looked_up or {}).get("location_confidence", 100 if geo.get("latitude") is not None else 0),

        },

        "network": network,

        "security": security,

        "risk": risk,

        "device": device,

        "login_method": event.get(
            "login_method"
        ),

        "mfa_enabled": event.get(
            "mfa_enabled",
            False
        ),

        **intelligence_fields,

    }


def parse_json_log(file_path):

    with open(file_path, "r", encoding="utf-8") as file:

        data = json.load(file)

    events = []

    for event in data:

        event.setdefault("failure_reason", None)
        event.setdefault("vpn_detected", False)
        event.setdefault("new_device", False)
        event.setdefault("device_trusted", True)
        event.setdefault("impossible_travel", False)
        event.setdefault("mfa_verified", event.get("mfa_enabled", False))

        events.append(

            normalize_event(event)

        )

    return events


def parse_csv_log(file_path):

    events = []

    with open(file_path, newline="", encoding="utf-8") as file:

        reader = csv.DictReader(file)

        for row in reader:

            events.append(

                normalize_event(row)

            )

    return events


def parse_log_file(file_path):

    if file_path.endswith(".json"):

        return parse_json_log(file_path)

    elif file_path.endswith(".csv"):

        return parse_csv_log(file_path)

    raise Exception(
        "Unsupported log format."
    )