class AuthenticationEvent:

    def __init__(
        self,
        username,
        ip_address,
        timestamp,
        browser,
        status,
        current_url,
        session_cookie_count,
        response_time,
        geo=None
    ):

        self.username = username
        self.ip_address = ip_address
        self.timestamp = timestamp
        self.browser = browser
        self.status = status
        self.current_url = current_url
        self.session_cookie_count = session_cookie_count
        self.response_time = response_time

        self.geo = geo or {}

    def to_dict(self):

        return {

            "username": self.username,

            "ip_address": self.ip_address,

            "timestamp": self.timestamp,

            "browser": self.browser,

            "status": self.status,

            "current_url": self.current_url,

            "session_cookie_count": self.session_cookie_count,

            "response_time": self.response_time,

            "geo": self.geo
        }