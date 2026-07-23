def calculate_security_score(signals):

    score = 0

    security = signals["security_signals"]

    if security["https_enabled"]:
        score += 20

    if security["hsts_header_present"]:
        score += 20

    if security["csp_header_present"]:
        score += 20

    if security["secure_cookies"]:
        score += 20

    if not security["captcha_detected"]:
        score += 20

    return score