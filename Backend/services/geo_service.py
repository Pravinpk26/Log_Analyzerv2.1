import requests


class GeoService:
    """
    Retrieves geographical information for an IP address.

    Uses ip-api.com's free tier, but requests its *extended* field set
    (proxy/hosting/mobile flags, plus the precision-affecting `query` /
    `status` fields) instead of the default subset. This is what powers:
      - a real location-confidence score (~80-90% typical accuracy for
        city-level IP geolocation, lower for mobile/carrier NAT ranges)
      - genuine "Suspicious IP" detection (proxy / VPN / hosting-datacenter
        origin), rather than a hard-coded keyword guess
    No paid key required — free tier supports up to 45 requests/minute.
    """

    BASE_URL = "http://ip-api.com/json/"

    # Only request the fields we actually use, in one round trip.
    FIELDS = (
        "status,message,country,countryCode,region,regionName,city,"
        "timezone,lat,lon,isp,org,as,mobile,proxy,hosting,query"
    )

    @staticmethod
    def get_location(ip_address: str) -> dict:
        """
        Returns geographical + network-reputation information for the
        given IP address.
        """

        if not ip_address or ip_address == "Unknown":
            return GeoService.empty_location(ip_address)

        try:

            response = requests.get(
                f"{GeoService.BASE_URL}{ip_address}",
                params={"fields": GeoService.FIELDS},
                timeout=5
            )

            data = response.json()

            if data.get("status") != "success":
                print(
                    f"[GeoService] Lookup failed for {ip_address}: "
                    f"{data.get('message', 'no message from ip-api')}"
                )
                return GeoService.empty_location(ip_address)

            is_proxy = bool(data.get("proxy"))
            is_hosting = bool(data.get("hosting"))
            is_mobile = bool(data.get("mobile"))

            # Confidence heuristic: city-level IP geolocation is typically
            # ~80-90% accurate for fixed-line residential/business IPs, but
            # meaningfully less reliable behind mobile carrier NAT or a
            # proxy/hosting network (the IP may not reflect the true user
            # location at all in those cases).
            if is_proxy or is_hosting:
                confidence = 45
            elif is_mobile:
                confidence = 65
            else:
                confidence = 88

            return {

                "ip": data.get("query", ip_address),

                "country": data.get("country"),

                "country_code": data.get("countryCode"),

                "region": data.get("regionName"),

                "city": data.get("city"),

                "timezone": data.get("timezone"),

                "latitude": data.get("lat"),

                "longitude": data.get("lon"),

                "isp": data.get("isp"),

                "organization": data.get("org"),

                "asn": data.get("as"),

                "is_proxy": is_proxy,

                "is_hosting": is_hosting,

                "is_mobile": is_mobile,

                "location_confidence": confidence

            }

        except Exception as exc:

            print(f"[GeoService] Lookup errored for {ip_address}: {exc}")

            return GeoService.empty_location(ip_address)

    @staticmethod
    def empty_location(ip_address="Unknown"):

        return {

            "ip": ip_address,

            "country": "Unknown",

            "country_code": "Unknown",

            "region": "Unknown",

            "city": "Unknown",

            "timezone": "Unknown",

            "latitude": None,

            "longitude": None,

            "isp": "Unknown",

            "organization": "Unknown",

            "asn": "Unknown",

            "is_proxy": False,

            "is_hosting": False,

            "is_mobile": False,

            "location_confidence": 0

        }