import socket

from services.geo_service import GeoService


def collect_signals(data):

    headers = data["headers"]
    cookies = data["cookies"]
    soup = data["soup"]
    html = data["html"]
    html_lower = html.lower()

    # --------------------------
    # NETWORK SIGNALS
    # --------------------------

    hostname = data["url"].split("//")[-1].split("/")[0]

    try:
        ip_address = socket.gethostbyname(hostname)
    except:
        ip_address = "Unknown"

    dns_information = hostname

    content_length = headers.get("Content-Length", "Unknown")

    protocol = (
        "HTTPS"
        if data["url"].startswith("https")
        else "HTTP"
    )

    network_signals = {

        "status_code": data["status_code"],

        "response_time_ms": data["response_time"],

        "server_header": headers.get("Server"),

        "redirect_chain": data["redirects"],

        "tls_version": headers.get("X-TLS-Version", "Unknown"),

        "ip_address": ip_address,

        "dns_information": dns_information,

        "content_length": content_length,

        "protocol": protocol
    }

    # --------------------------
    # GEO INFORMATION
    # --------------------------

    geo_information = GeoService.get_location(ip_address)

    # --------------------------
    # SECURITY SIGNALS
    # --------------------------

    security_signals = {

        "https_enabled": True,

        "hsts_header_present":
            "Strict-Transport-Security" in headers,

        "csp_header_present":
            "Content-Security-Policy" in headers,

        "secure_cookies":
            any(
                "secure" in str(cookie).lower()
                for cookie in cookies.values()
            ),

        "captcha_detected":
            (
                "captcha" in html_lower or
                "recaptcha" in html_lower
            )
    }

    # --------------------------
    # SESSION SIGNALS
    # --------------------------

    title = (
        data["page_title"]
        if data["page_title"]
        else "Unknown"
    )

    session_signals = {

        "page_title": title,

        "current_url": data["current_url"],

        "browser": data["browser"],

        "login_timestamp": data["login_timestamp"],

        "session_cookie_count":
            data["session_cookie_count"],

        "login_success":
            data["login_success"]
    }

    # --------------------------
    # AUTHENTICATION SIGNALS
    # --------------------------

    login_form_detected = False
    password_field_present = False
    form_method = None

    forms = soup.find_all("form")

    for form in forms:

        password_input = form.find(
            "input",
            {"type": "password"}
        )

        if password_input:

            login_form_detected = True
            password_field_present = True

            form_method = (
                form.get("method", "GET")
                .upper()
            )

            break

    oauth_providers = []

    if "google" in html_lower:
        oauth_providers.append("Google")

    if "github" in html_lower:
        oauth_providers.append("GitHub")

    if "facebook" in html_lower:
        oauth_providers.append("Facebook")

    if "microsoft" in html_lower:
        oauth_providers.append("Microsoft")

    keywords = [
        "otp",
        "2fa",
        "mfa",
        "two-factor",
        "verification code"
    ]

    mfa_detected = any(
        keyword in html_lower
        for keyword in keywords
    )

    remember_me_present = (
        "remember me" in html_lower
    )

    authentication_signals = {

        "login_form_detected": login_form_detected,

        "password_field_present": password_field_present,

        "form_method": form_method,

        "oauth_providers": oauth_providers,

        "mfa_indicator": mfa_detected,

        "remember_me_present": remember_me_present
    }

    # --------------------------
    # FINAL SIGNALS
    # --------------------------

    signals = {

        "network_signals": network_signals,

        "security_signals": security_signals,

        "session_signals": session_signals,

        "authentication_signals": authentication_signals,

        "geo_information": geo_information
    }

    return signals