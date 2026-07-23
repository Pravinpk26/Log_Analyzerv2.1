"""
Classifies the overall "type of attack" for a session from findings that
are ALREADY computed by anomaly_detector.py / threat_detection_engine.py.

This deliberately does not re-derive anything from raw events — it just
reads the pattern of findings already produced elsewhere, so the
classification stays consistent with whatever the dashboard already
displays for those findings.
"""


def classify_attack(threats, anomalies, statistics):
    types_present = {t.get("type") for t in (threats or [])} | \
                    {a.get("type") for a in (anomalies or [])}

    failed_logins = statistics.get("failed_logins", 0)
    unique_ips = statistics.get("unique_ips", 0)

    if "Repeated Password Resets" in types_present or "Disabled Security Controls" in types_present:
        return {
            "attack_type": "Account Takeover Attempt",
            "description": (
                "Password-reset abuse and/or a security-control change suggest an attacker may "
                "already hold partial access and is trying to lock out the legitimate owner or "
                "persist undetected."
            ),
        }

    if "Impossible Travel" in types_present or "Unrecognized Device" in types_present:
        return {
            "attack_type": "Credential Reuse / Session Hijacking",
            "description": (
                "A valid credential appears to be in active use from more than one location or "
                "device within an implausible timeframe."
            ),
        }

    if "Unsolicited MFA Prompt" in types_present:
        return {
            "attack_type": "MFA Fatigue Attack",
            "description": (
                "An MFA prompt was generated with no matching active login attempt — consistent "
                "with an attacker who already has the password attempting to push through a "
                "second factor."
            ),
        }

    if failed_logins >= 5 and unique_ips <= 2:
        return {
            "attack_type": "Brute Force Attempt",
            "description": (
                f"{failed_logins} failed logins from only {unique_ips or 1} IP address(es) is "
                "consistent with manual or scripted password guessing against a single account."
            ),
        }

    if unique_ips >= 3 and failed_logins >= 3:
        return {
            "attack_type": "Credential Stuffing",
            "description": (
                f"Login attempts arrived from {unique_ips} distinct IP addresses with "
                f"{failed_logins} failures, consistent with automated tooling testing leaked "
                "credentials across many sources."
            ),
        }

    if "Suspicious IP Address" in types_present:
        return {
            "attack_type": "Anonymized Access Attempt",
            "description": (
                "Login activity originated from a proxy, VPN, or hosting/datacenter IP range "
                "rather than a typical residential or business network."
            ),
        }

    return {
        "attack_type": "No Active Attack Pattern Detected",
        "description": "Current session data does not match a known attack pattern.",
    }
