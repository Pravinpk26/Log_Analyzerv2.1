"""
Converts GPS coordinates into a neighbourhood-level, human-readable
location using OpenStreetMap's free Nominatim reverse-geocoding service.

This is only useful when paired with the BROWSER's own geolocation API
(navigator.geolocation), which itself relies on the host machine's real
location services (Wi-Fi positioning / GPS) — IP-address geolocation
alone cannot get more precise than city-level, no matter which service
or "zoom level" you ask it for. If the browser's geolocation call fails,
is denied, or the host machine has no location services (e.g. a
headless cloud server), reverse_geocode() is simply never called and
the app correctly falls back to city-level IP geolocation.
"""

import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

# Nominatim's usage policy requires a real identifying User-Agent and a
# max of ~1 request/second — both fine for our one-lookup-per-scan usage.
HEADERS = {"User-Agent": "LogAnalyzerv2-SecurityDashboard/1.0"}


def reverse_geocode(latitude, longitude):
    """
    Returns neighbourhood-level location details for a GPS coordinate,
    or None on any failure (network, rate limit, no data at that
    location) so callers can gracefully fall back to city-level data.
    """

    if latitude is None or longitude is None:
        return None

    try:
        response = requests.get(
            NOMINATIM_URL,
            params={
                "format": "json",
                "lat": latitude,
                "lon": longitude,
                "zoom": 16,  # 16 = neighbourhood/suburb-level detail
                "addressdetails": 1,
            },
            headers=HEADERS,
            timeout=6,
        )

        data = response.json()
        address = data.get("address", {}) or {}

        area = (
            address.get("suburb")
            or address.get("neighbourhood")
            or address.get("residential")
            or address.get("quarter")
            or address.get("city_district")
            or address.get("village")
        )

        if not area:
            return None

        return {
            "area": area,
            "road": address.get("road"),
            "city": address.get("city") or address.get("town") or address.get("municipality"),
            "state": address.get("state"),
            "country": address.get("country"),
            "postcode": address.get("postcode"),
            "display_name": data.get("display_name"),
            "latitude": latitude,
            "longitude": longitude,
            "source": "browser_geolocation",
        }

    except Exception:
        return None
