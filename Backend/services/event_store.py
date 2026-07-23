from copy import deepcopy

# Stores all authentication events
authentication_events = []


def add_event(event):

    authentication_events.append(deepcopy(event))


def get_all_events():

    return deepcopy(authentication_events)


def get_latest_event():

    if authentication_events:
        return deepcopy(authentication_events[-1])

    return None


def total_events():

    return len(authentication_events)


def clear_events():

    authentication_events.clear()