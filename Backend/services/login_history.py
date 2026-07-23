# Stores all authentication events

login_history = []


def add_login_event(event):

    login_history.append(event)


def get_login_history():

    return login_history


def get_total_logins():

    return len(login_history)


def get_failed_logins():

    return len(
        [
            event
            for event in login_history
            if event["status"] == "Failed"
        ]
    )


def get_successful_logins():

    return len(
        [
            event
            for event in login_history
            if event["status"] == "Success"
        ]
    )


def get_unique_ips():

    return len(
        {
            event["ip_address"]
            for event in login_history
        }
    )


def clear_history():

    login_history.clear()