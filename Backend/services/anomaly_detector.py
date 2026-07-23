def detect_anomalies(statistics, event):

    anomalies = []

    # ------------------------------------------------
    # Multiple IP Addresses
    # ------------------------------------------------

    if statistics["unique_ips"] >= 3:

        anomalies.append({

            "type": "Multiple IP Addresses",

            "message": "Authentication events originated from multiple public IP addresses.",

            "severity": "Medium"

        })

    # ------------------------------------------------
    # Slow Authentication
    # ------------------------------------------------

    if event.get("response_time", 0) > 5000:

        anomalies.append({

            "type": "Slow Authentication",

            "message": "Authentication response time exceeded the acceptable threshold.",

            "severity": "Low"

        })

    # ------------------------------------------------
    # Performance Issue
    # ------------------------------------------------

    if event.get("response_time", 0) > 10000:

        anomalies.append({

            "type": "Performance Issue",

            "message": "Authentication response exceeded 10 seconds.",

            "severity": "Medium"

        })

    # ------------------------------------------------
    # New Country Login
    # ------------------------------------------------

    if event.get("geo", {}).get("country") not in [
        "India",
        "United States"
    ]:

        anomalies.append({

            "type": "New Country Login",

            "message": f'Authentication originated from {event["geo"]["country"]}.',

            "severity": "Low"

        })

    # ------------------------------------------------
    # Failed Login
    # ------------------------------------------------

    if event.get("status") == "Failed":

        reason = event.get(
            "failure_reason",
            "Unknown"
        )

        severity = "Medium"

        if reason == "Invalid Password":
            severity = "Low"

        elif reason == "Wrong OTP":
            severity = "Medium"

        elif reason == "VPN Detected":
            severity = "Medium"

        elif reason == "New Device Login":
            severity = "Medium"

        elif reason == "Impossible Travel":
            severity = "High"

        elif reason == "Brute Force Threshold Exceeded":
            severity = "High"

        elif reason == "MFA Verification Failed":
            severity = "High"

        anomalies.append({

            "type": "Authentication Failure",

            "message": reason,

            "severity": severity

        })

    # ------------------------------------------------
    # VPN Detection
    # ------------------------------------------------

    if event.get("vpn_detected"):

        anomalies.append({

            "type": "VPN Usage",

            "message": "Authentication originated through a VPN connection.",

            "severity": "Medium"

        })

    # ------------------------------------------------
    # Impossible Travel
    # ------------------------------------------------

    if event.get("impossible_travel"):

        anomalies.append({

            "type": "Impossible Travel",

            "message": "Authentication occurred from geographically distant locations within an unrealistic time window.",

            "severity": "High"

        })

    # ------------------------------------------------
    # New Device
    # ------------------------------------------------

    if event.get("new_device"):

        anomalies.append({

            "type": "New Device Login",

            "message": "Authentication originated from an unrecognized device.",

            "severity": "Medium"

        })

    # ------------------------------------------------
    # Untrusted Device
    # ------------------------------------------------

    if event.get("device_trusted") is False:

        anomalies.append({

            "type": "Untrusted Device",

            "message": "Authentication performed from an untrusted device.",

            "severity": "Medium"

        })

    return anomalies