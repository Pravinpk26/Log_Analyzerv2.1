def categorize_uploaded_logs(event):

    network_logs = {

        "ip_address": event.get("ip_address"),

        "response_time": event.get("response_time"),

        "protocol": event.get("network", {}).get("protocol"),

        "tls_version": event.get("network", {}).get("tls_version"),

        "https_enabled": event.get("network", {}).get("https_enabled"),

        "content_length": event.get("network", {}).get("content_length"),

    }

    security_logs = {

        "mfa_enabled": event.get("mfa_enabled"),

        "secure_cookies": event.get("security", {}).get("secure_cookies"),

        "captcha_detected": event.get("security", {}).get("captcha_detected"),

        "hsts_enabled": event.get("security", {}).get("hsts_enabled"),

        "csp_enabled": event.get("security", {}).get("csp_enabled"),

        "risk_level": event.get("risk", {}).get("risk_level"),

        "risk_score": event.get("risk", {}).get("risk_score"),

    }

    session_logs = {

        "browser": event.get("browser"),

        "device": event.get("device", {}).get("device_type"),

        "operating_system": event.get("device", {}).get("operating_system"),

        "session_cookie_count": event.get("session_cookie_count"),

    }

    authentication_logs = {

        "username": event.get("username"),

        "email": event.get("email"),

        "status": event.get("status"),

        "login_method": event.get("login_method"),

        "timestamp": event.get("timestamp"),

    }

    return {

        "network_logs": network_logs,

        "security_logs": security_logs,

        "session_logs": session_logs,

        "authentication_logs": authentication_logs,

    }