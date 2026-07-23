from datetime import datetime


def get_dashboard_metrics(events, statistics, risk, anomalies):

    latest_event = events[-1] if events else {}

    # -----------------------------
    # Average Response Time
    # -----------------------------

    response_times = [
        event.get("response_time", 0)
        for event in events
        if event.get("response_time")
    ]

    average_response = (
        round(sum(response_times) / len(response_times))
        if response_times
        else 0
    )

    # -----------------------------
    # Countries
    # -----------------------------

    countries = set()

    cities = set()

    for event in events:

        geo = event.get("geo", {})

        if geo.get("country"):

            countries.add(
                geo["country"]
            )

        if geo.get("city"):

            cities.add(
                geo["city"]
            )

    # -----------------------------
    # Threat Severity
    # -----------------------------

    high = 0
    medium = 0
    low = 0

    for anomaly in anomalies:

        severity = anomaly["severity"]

        if severity == "High":
            high += 1

        elif severity == "Medium":
            medium += 1

        else:
            low += 1

    # -----------------------------
    # Final Object
    # -----------------------------

    return {

        "risk_score":
            risk["risk_score"],

        "risk_level":
            risk["risk_level"],

        "total_sessions":
            statistics["total_logins"],

        "successful_sessions":
            statistics["successful_logins"],

        "failed_sessions":
            statistics["failed_logins"],

        "unique_ips":
            statistics["unique_ips"],

        "average_response":
            average_response,

        "countries":
            len(countries),

        "cities":
            len(cities),

        "threat_high":
            high,

        "threat_medium":
            medium,

        "threat_low":
            low,

        "last_scan":
            latest_event.get(
                "timestamp",
                datetime.now().strftime("%H:%M:%S")
            )
    }