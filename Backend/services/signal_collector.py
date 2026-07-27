import socket

from services.geo_service import GeoService
from services.precise_location_service import reverse_geocode


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
        target_server_ip = socket.gethostbyname(hostname)
    except:
        target_server_ip = "Unknown"

    # This is the important one for security analysis: the IP of the
    # machine actually performing the login (i.e. wherever this scan is
    # physically running from), NOT the target website's server IP.
    # Geolocating the target's DNS-resolved IP was showing the site's
    # hosting data center (e.g. Azure/GitHub's infrastructure) as if it
    # were the login's origin, which is a different thing entirely.
    client_ip_address = GeoService.get_public_ip()

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

        # The actual login-origin IP — this is what geolocation and
        # threat detection (impossible travel, suspicious IP, etc.)
        # should use.
        "ip_address": client_ip_address,

        # The scanned site's own server IP — kept separately, purely
        # informational (e.g. for DNS/network diagnostics), and should
        # NEVER be geolocated as if it were the login's origin.
        "target_server_ip": target_server_ip,

        "dns_information": dns_information,

        "content_length": content_length,

        "protocol": protocol
    }

    # --------------------------
    # GEO INFORMATION
    # --------------------------

    geo_information = GeoService.get_location(client_ip_address)

    # If the browser was able to get a real GPS/Wi-Fi-based fix (see
    # interaction_engine.py), reverse-geocode it for neighbourhood-level
    # detail and layer it on top of the city-level IP data. This is
    # additive and best-effort — if it's unavailable (denied permission,
    # no location services on this machine, offline geocoding service),
    # geo_information simply stays at its IP-based city-level accuracy.
    browser_geolocation = data.get("browser_geolocation")
    if browser_geolocation:
        precise = reverse_geocode(
            browser_geolocation.get("latitude"),
            browser_geolocation.get("longitude"),
        )
        if precise:
            geo_information = {
                **geo_information,
                "area": precise.get("area"),
                "road": precise.get("road"),
                "precise_latitude": precise.get("latitude"),
                "precise_longitude": precise.get("longitude"),
                "location_accuracy_meters": browser_geolocation.get("accuracy"),
                "location_source": "browser_geolocation",
                # A real device-reported GPS/Wi-Fi fix is much more
                # trustworthy than an IP-database guess.
                "location_confidence": 95,
            }

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