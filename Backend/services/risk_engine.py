def calculate_risk_score(signals, statistics):

    risk_score = 0

    security = signals.get("security_signals", {})
    authentication = signals.get("authentication_signals", {})

    # --------------------------
    # SECURITY CHECKS
    # --------------------------

    if security.get("https_enabled"):
        risk_score += 20

    if security.get("hsts_header_present"):
        risk_score += 15

    if security.get("csp_header_present"):
        risk_score += 15

    if security.get("secure_cookies"):
        risk_score += 15

    if authentication.get("mfa_indicator"):
        risk_score += 10

    # --------------------------
    # LOGIN ACTIVITY
    # --------------------------

    if statistics["failed_logins"] >= 3:
        risk_score -= 20

    if statistics["failed_logins"] >= 5:
        risk_score -= 30

    if statistics["unique_ips"] > 3:
        risk_score -= 15

    if statistics["successful_logins"] == 0:
        risk_score -= 20

    # --------------------------
    # LIMIT SCORE
    # --------------------------

    risk_score = max(0, min(risk_score, 100))

    # --------------------------
    # RISK LEVEL
    # --------------------------

    if risk_score >= 80:
        risk_level = "Low"

    elif risk_score >= 50:
        risk_level = "Medium"

    else:
        risk_level = "High"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level
    }