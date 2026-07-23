from services.event_store import get_all_events


def get_dashboard_summary():

    events = get_all_events()

    total_events = len(events)

    successful_logins = sum(
        1
        for event in events
        if event.get("status", "").lower() == "success"
    )

    failed_logins = sum(
        1
        for event in events
        if event.get("status", "").lower() == "failed"
    )

    unique_ips = len(
        set(
            event.get("ip_address")
            for event in events
            if event.get("ip_address")
        )
    )

    browsers = {}

    for event in events:

        browser = event.get("browser", "Unknown")

        browsers[browser] = browsers.get(browser, 0) + 1

    most_used_browser = (
        max(browsers, key=browsers.get)
        if browsers
        else "Unknown"
    )

    # NOTE: This endpoint intentionally does NOT compute its own risk/security
    # score. The canonical Security Score (0-100, higher = safer) comes from
    # services/risk_engine.py, produced during a live /scan (see main.py's
    # /scan handler, returned under the "risk" key). Computing a second,
    # different formula here caused KPI/Threat-Intel/AI/Reports to disagree
    # with each other — so it's been removed rather than duplicated.
    #
    # Before any scan has run, the frontend falls back to a single
    # deterministic baseline estimate (see src/lib/derive.js ->
    # computeCanonicalRisk), so there's still only ONE formula in play at
    # any given time, just sourced from different places depending on
    # whether a live scan has happened yet.

    return {

        "total_events": total_events,

        "successful_logins": successful_logins,

        "failed_logins": failed_logins,

        "unique_ips": unique_ips,

        "most_used_browser": most_used_browser,

        "events": events

    }
