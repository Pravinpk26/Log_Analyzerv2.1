from dotenv import load_dotenv
load_dotenv()  # loads Backend/.env (GEMINI_API_KEY, etc.) if present

import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.interaction_engine import interact_with_website
from services.signal_collector import collect_signals
from services.precise_location_service import reverse_geocode
from services.Log_categorizer import categorize_logs
from services.security_score import calculate_security_score
from services.risk_engine import calculate_risk_score
from services.anomaly_detector import detect_anomalies
from services.threat_detection_engine import detect_threats
from services.ai_insights_engine import generate_ai_insights
from services.gemini_incident_engine import generate_incident_summary
from services.executive_report import build_executive_report
from fastapi import UploadFile, File
from services.event_store import get_all_events
from services.log_parser import parse_log_file
from services.dashboard_summary import get_dashboard_summary
from services.event_store import add_event
from services.dashboard_metrics import get_dashboard_metrics

from services.authentication_event_collector import (
    create_authentication_event
)

from services.login_history import (
    add_login_event,
    get_total_logins,
    get_failed_logins,
    get_successful_logins,
    get_unique_ips,
    clear_history
)

from services.event_store import (
    add_event,
    get_all_events,
    total_events,
    clear_events
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory cache for the most recent precise (browser-reported)
# location, submitted from the dashboard's own tab via /precise-location.
# This is far more reliable than trying to get Playwright's automated
# browser to obtain OS-level location permission (that native OS dialog
# can't be clicked by automation and will just time out). A regular
# browser tab shows a real "Allow location?" prompt the person can
# actually click, which is what this endpoint is for.
_precise_location_cache = {"data": None, "set_at": None}
PRECISE_LOCATION_MAX_AGE_SECONDS = 600  # treat as stale after 10 minutes


class PreciseLocationPayload(BaseModel):
    latitude: float
    longitude: float
    accuracy: float | None = None


@app.post("/precise-location")
def set_precise_location(payload: PreciseLocationPayload):
    """
    Called from the dashboard's own browser tab (not the automated
    Playwright scan) after the user grants a real geolocation permission
    prompt. Reverse-geocodes the coordinates into a neighbourhood-level
    place name and caches it so the next /scan can attach it to the
    resulting event instead of only city-level IP geolocation.
    """

    precise = reverse_geocode(payload.latitude, payload.longitude)

    if not precise:
        return {
            "success": False,
            "message": "Could not resolve a neighbourhood-level location for these coordinates.",
        }

    precise["location_accuracy_meters"] = payload.accuracy

    _precise_location_cache["data"] = precise
    _precise_location_cache["set_at"] = time.time()

    return {"success": True, "location": precise}


@app.get("/precise-location")
def get_precise_location():
    """Returns the currently cached precise location, if any and not stale."""

    data = _precise_location_cache["data"]
    set_at = _precise_location_cache["set_at"]

    if not data or not set_at or (time.time() - set_at) > PRECISE_LOCATION_MAX_AGE_SECONDS:
        return {"location": None}

    return {"location": data, "age_seconds": round(time.time() - set_at)}


def _analyze_all_events(events, statistics):
    """
    Runs both detection engines across every stored event (not just the
    latest one), building up history incrementally so identity/self
    comparisons stay correct. Used by the Executive Report, which needs
    a full attack timeline rather than a single event's findings.
    """

    all_anomalies = []
    all_threats = []
    running_history = []

    for event in events:
        running_history.append(event)
        all_anomalies.extend(detect_anomalies(statistics, event))
        all_threats.extend(detect_threats(running_history, event))

    return all_anomalies, all_threats


@app.get("/")
def home():

    return {

        "message": "Log Analyzer Dashboard API"

    }

@app.get("/dashboard")
def dashboard():

    return get_dashboard_summary()


@app.get("/scan")
def scan(url: str):

    # Step 1
    raw_data = interact_with_website(url)

    # Step 2
    signals = collect_signals(raw_data)

    # Step 2.5 — If the dashboard's own browser tab has recently reported
    # a precise (real permission-granted) location via /precise-location,
    # it's more trustworthy than city-level IP geolocation or the
    # automated Playwright browser's location attempt (which usually
    # can't get past the OS-level permission dialog). Layer it on top.
    cached_precise = _precise_location_cache["data"]
    cached_set_at = _precise_location_cache["set_at"]
    if cached_precise and cached_set_at and (time.time() - cached_set_at) <= PRECISE_LOCATION_MAX_AGE_SECONDS:
        signals["geo_information"] = {
            **signals.get("geo_information", {}),
            **cached_precise,
            "location_source": "browser_geolocation",
            "location_confidence": 95,
        }

    # Step 3
    authentication_event = create_authentication_event(signals)
    add_event(authentication_event)

    # Step 4
    add_login_event(authentication_event)

    # Step 5
    categorized_logs = categorize_logs(signals)

    # Step 6 — this IS the canonical Security Score (0-100, higher = safer).
    # It already blends security-header hygiene with login activity risk, so
    # every part of the frontend (KPI gauge, Threat Intel, AI panel, Reports)
    # should read this same value rather than recomputing its own version.
    statistics = {
        "total_logins": get_total_logins(),
        "successful_logins": get_successful_logins(),
        "failed_logins": get_failed_logins(),
        "unique_ips": get_unique_ips()
    }
    security_posture = calculate_risk_score(
        signals,
        statistics
    )

    security_score = calculate_security_score(signals)

    anomalies = detect_anomalies(
        statistics,
        authentication_event
    )

    # Step 6.5 — Real threat-detection engine: computes the 7 red flags
    # (impossible travel, unrecognized device, odd timestamp, unsolicited
    # MFA, repeated resets, disabled controls, suspicious IP) from actual
    # login history, each tagged with a MITRE ATT&CK technique. This is
    # separate from detect_anomalies() above, which handles simpler
    # aggregate-statistics checks (multiple IPs, slow auth, etc).
    threats = detect_threats(
        get_all_events(),
        authentication_event
    )

    dashboard_metrics = get_dashboard_metrics(
        get_all_events(),
        statistics,
        security_posture,
        anomalies + threats
    )

    # Step 7 - AI Analysis Engine (reuses the same statistics/anomalies/
    # security_posture computed above — no duplicate calculations, and
    # `signals` is passed through so the security-header analyzer can run).
    ai_insights_result = generate_ai_insights(
        statistics,
        anomalies + threats,
        security_posture,
        authentication_event,
        get_all_events(),
        signals
    )

    # Step 8 - AI-Based Incident Summary (Gemini, with deterministic
    # fallback if no API key is configured or the call fails).
    incident_summary = generate_incident_summary(
        statistics,
        anomalies,
        threats,
        security_posture
    )

    # Step 9 - Executive Report: Executive Summary, Events Analyzed,
    # Critical Alerts, High-Risk IPs, Attack Timeline, Type of Attack,
    # Top Error Types, Vulnerability Indicators, Recommended Actions,
    # Overall Score — all in one consolidated payload for the dashboard.
    executive_report = build_executive_report(
        get_all_events(),
        statistics,
        security_posture,
        anomalies,
        threats,
        signals,
        ai_insights_result
    )

    return {

        # Header-hygiene score only (HTTPS/HSTS/CSP/cookies/captcha).
        # Kept separate from the canonical Security Score below since it
        # measures a different, narrower thing (the page's header posture,
        # not overall account/session risk).
        "security_score": security_score,

        "anomalies": anomalies,

        "threats": threats,

        "ai_insights": ai_insights_result,

        "ai_incident_summary": incident_summary,

        "executive_report": executive_report,

        "dashboard_metrics": dashboard_metrics,

        # Canonical Security Score for this session — 0-100, higher = safer.
        # This is what the frontend should treat as the single source of
        # truth (previously exposed under the "risk" key).
        "risk": security_posture,

        "results": signals,

        "authentication_event": authentication_event,

        "event_store": {
            "total_events": total_events(),
            "latest_event": authentication_event
        },


        "statistics": {

            "total_logins":
                get_total_logins(),

            "successful_logins":
                get_successful_logins(),

            "failed_logins":
                get_failed_logins(),

            "unique_ips":
                get_unique_ips()
        }


    }

@app.get("/events")
def get_events():

    return {

        "events": get_all_events()

    }


@app.get("/ai-insights")
def get_ai_insights():
    """
    Standalone AI Analysis Engine endpoint.

    Runs the rule-based engine against the current session's aggregate
    statistics and most recent authentication event, so the frontend can
    refresh the "AI Insights & Recommendations" panel independently of
    running a new /scan (e.g. on a polling interval, or after /upload-log).

    Note: `signals` (HTTP security headers) only exist right after a live
    /scan, so the security-header analyzer won't fire from this endpoint —
    that's expected, not a bug. It fires from /scan's response instead.
    """

    events = get_all_events()

    statistics = {
        "total_logins": get_total_logins(),
        "successful_logins": get_successful_logins(),
        "failed_logins": get_failed_logins(),
        "unique_ips": get_unique_ips()
    }

    latest_event = events[-1] if events else {}

    # No live `signals` object exists outside of /scan, so this endpoint
    # builds a minimal, clearly-labeled baseline security posture instead of
    # duplicating risk_engine's real formula with a different one.
    baseline_security_posture = {
        "risk_score": max(0, 100 - (statistics["failed_logins"] * 15)),
        "risk_level": (
            "High" if statistics["failed_logins"] >= 3
            else "Medium" if statistics["failed_logins"] >= 1
            else "Low"
        )
    }

    anomalies = detect_anomalies(
        statistics,
        latest_event
    ) if latest_event else []

    threats = detect_threats(events, latest_event) if latest_event else []

    insights = generate_ai_insights(
        statistics,
        anomalies + threats,
        baseline_security_posture,
        latest_event,
        events
    )

    insights["ai_incident_summary"] = generate_incident_summary(
        statistics,
        anomalies,
        threats,
        baseline_security_posture
    )
    insights["threats"] = threats

    return insights


@app.post("/upload-log")
async def upload_log(file: UploadFile = File(...)):

    file_path = f"temp_{file.filename}"

    with open(file_path, "wb") as f:

        f.write(await file.read())

    events = parse_log_file(file_path)

    all_threats = []

    # Built up incrementally, in-process, so each event's identity check
    # against "prior" events is based on true object identity — this
    # deliberately avoids reusing get_all_events() (which deepcopies) for
    # the *history* argument here, since a deepcopy of the same event
    # would otherwise get miscounted as a distinct prior occurrence of
    # itself (e.g. double-counting a single password-reset event).
    running_history = []

    for event in events:

        running_history.append(event)

        # Run the real threat-detection engine against each imported
        # event, using every event imported so far (including this one)
        # as its identity's history — so impossible-travel / new-device /
        # repeated-reset checks work across the uploaded log, not just on
        # a single live /scan.
        event_threats = detect_threats(running_history, event)
        all_threats.extend(event_threats)

        add_event(event)
        add_login_event(event)

    import os
    try:
        os.remove(file_path)
    except OSError:
        pass

    return {

        "message": "Log uploaded successfully.",

        "events_imported": len(events),

        "threats_detected": len(all_threats),

        "threats": all_threats,

    }


@app.post("/reset")
def reset_session():
    """
    Reset Session — clears the in-memory Event Store and login history so
    the dashboard returns to its initial state. Reuses the existing
    clear_events()/clear_history() functions rather than adding new state.
    Useful for demos and repeated testing.
    """

    clear_events()
    clear_history()

    return {

        "message": "Session reset successfully.",

        "total_events": total_events()

    }
