def categorize_logs(signals):

    # --------------------------
    # NETWORK LOGS
    # --------------------------
    network_logs = {

        "Status Code":
            signals["network_signals"]["status_code"],

        "Response Time":
            f'{signals["network_signals"]["response_time_ms"]} ms',

        "Server":
            signals["network_signals"]["server_header"],

        "Redirect Chain":
            signals["network_signals"]["redirect_chain"],

        "TLS Version":
            signals["network_signals"]["tls_version"],

        "IP Address":
            signals["network_signals"]["ip_address"],

        "DNS Information":
            signals["network_signals"]["dns_information"],

        "Content Length":
            signals["network_signals"]["content_length"],

        "Protocol":
            signals["network_signals"]["protocol"]
    }

    # --------------------------
    # SECURITY LOGS
    # --------------------------
    security_logs = {

        "HTTPS Enabled":
            signals["security_signals"]["https_enabled"],

        "HSTS Header":
            signals["security_signals"]["hsts_header_present"],

        "CSP Header":
            signals["security_signals"]["csp_header_present"],

        "Secure Cookies":
            signals["security_signals"]["secure_cookies"],

        "CAPTCHA Detected":
            signals["security_signals"]["captcha_detected"]
    }

    # --------------------------
    # SESSION LOGS
    # --------------------------
    session_logs = {

        "Current URL":
            signals["session_signals"]["current_url"],

        "Page Title":
            signals["session_signals"]["page_title"],

        "Browser":
            signals["session_signals"]["browser"],

        "Login Timestamp":
            signals["session_signals"]["login_timestamp"],

        "Session Cookies":
            signals["session_signals"]["session_cookie_count"],

        "Login Successful":
            signals["session_signals"]["login_success"]
    }

    # --------------------------
    # AUTHENTICATION LOGS
    # --------------------------
    authentication_logs = {

        "Login Form":
            signals["authentication_signals"]["login_form_detected"],

        "Password Field":
            signals["authentication_signals"]["password_field_present"],

        "Form Method":
            signals["authentication_signals"]["form_method"],

        "OAuth Providers":
            signals["authentication_signals"]["oauth_providers"],

        "MFA Indicator":
            signals["authentication_signals"]["mfa_indicator"],

        "Remember Me":
            signals["authentication_signals"]["remember_me_present"]
    }

    # --------------------------
    # FINAL CATEGORIZED LOGS
    # --------------------------
    categorized_logs = {

        "network_logs": network_logs,

        "security_logs": security_logs,

        "session_logs": session_logs,

        "authentication_logs": authentication_logs
    }

    return categorized_logs