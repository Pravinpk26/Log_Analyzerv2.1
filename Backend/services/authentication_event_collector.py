from models.authentication_event import AuthenticationEvent


def create_authentication_event(session_data):

    event = AuthenticationEvent(

        username="Unknown",

        ip_address=session_data["network_signals"]["ip_address"],

        timestamp=session_data["session_signals"]["login_timestamp"],

        browser=session_data["session_signals"]["browser"],

        status=(
            "Success"
            if session_data["session_signals"]["login_success"]
            else "Failed"
        ),

        current_url=session_data["session_signals"]["current_url"],

        session_cookie_count=session_data["session_signals"]["session_cookie_count"],

        response_time=session_data["network_signals"]["response_time_ms"],

        geo=session_data.get("geo_information", {})

    )

    return event.to_dict()