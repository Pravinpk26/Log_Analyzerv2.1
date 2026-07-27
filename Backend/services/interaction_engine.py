from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
from datetime import datetime
import time


FAILURE_KEYWORDS = [
    "incorrect",
    "invalid",
    "wrong password",
    "incorrect password",
    "invalid username",
    "invalid credentials",
    "try again",
    "authentication failed",
    "sign in failed",
]

# Phrases that show up on a provider's own anti-automation / block page
# (e.g. Google's "This browser or app may not be secure"). We don't try to
# get past these — we just recognize them so the scan reports a clean,
# accurate "Blocked by provider" result instead of crashing or silently
# mis-labelling it as a normal failed login.
BLOCKED_BY_PROVIDER_KEYWORDS = [
    "couldn't sign you in",
    "this browser or app may not be secure",
    "browser or app may not be secure",
    "verify it's you",
    "unusual activity",
    "automated queries",
]


def _safe_page_text(page) -> str:
    """
    Best-effort, never-throws extraction of visible page text.
    Falls back gracefully if the body locator fails, times out,
    or the page has already navigated/closed.
    """
    try:
        return page.locator("body").inner_text(timeout=5000).lower()
    except Exception:
        return ""


def _safe_title(page) -> str:
    try:
        return page.title() or "Unknown"
    except Exception:
        return "Unknown"


def _safe_html(page) -> str:
    try:
        return page.content() or ""
    except Exception:
        return ""


def interact_with_website(url):
    """
    Drives a browser session against `url` and captures signals for
    analysis. This function must never raise — any failure (navigation
    error, timeout, provider block page, closed browser, malformed HTML)
    is caught and turned into a structured result so the API always
    returns 200 with a meaningful status instead of a 500.
    """

    start = time.time()
    browser = None

    try:
        with sync_playwright() as p:

            browser = p.chromium.launch(headless=False)
            context = browser.new_context()
            page = context.new_page()

            print("\nOpening Login Page...\n")

            response = None
            nav_error = None

            try:
                response = page.goto(
                    url,
                    wait_until="networkidle",
                    timeout=30000,
                )
            except PlaywrightTimeoutError:
                # Page kept loading (long-polling scripts, live sockets,
                # etc). Not fatal — we still have a page to inspect.
                nav_error = "navigation_timeout"
            except Exception as exc:
                nav_error = f"navigation_error: {exc}"

            # ------------------------------------------------------------
            # Ask the browser's own geolocation API for a precise fix.
            # Unlike IP-address lookups (city-level at best), this uses
            # the HOST MACHINE's real location services (Wi-Fi
            # positioning / GPS), which can resolve to street/
            # neighbourhood level. This only works if location services
            # are enabled on the machine actually running this scan — on
            # a headless server with no Wi-Fi/GPS, it will simply time
            # out and return None, and the app falls back to city-level
            # IP geolocation automatically.
            # ------------------------------------------------------------
            browser_geolocation = None
            try:
                origin = "/".join(url.split("/")[:3])
                context.grant_permissions(["geolocation"], origin=origin)
                browser_geolocation = page.evaluate(
                    """
                    () => new Promise((resolve) => {
                        if (!navigator.geolocation) { resolve(null); return; }
                        navigator.geolocation.getCurrentPosition(
                            (pos) => resolve({
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                                accuracy: pos.coords.accuracy
                            }),
                            () => resolve(null),
                            { timeout: 8000, maximumAge: 0 }
                        );
                    })
                    """
                )
            except Exception:
                browser_geolocation = None

            print("=" * 60)
            print("Browser is open. Log in as normal — this stays open")
            print("until YOU close the browser window.")
            print("=" * 60)

            # ------------------------------------------------------------
            # Wait for the user to close the browser themselves, instead
            # of guessing when "login is complete". We keep refreshing a
            # snapshot every second so that once the page/browser closes,
            # we still have the last good state to analyze — a closed
            # page can't be queried at all.
            # ------------------------------------------------------------
            MAX_WAIT_SECONDS = 1800  # 30-minute safety cap for an abandoned scan

            last_known_url = url
            last_known_html = ""
            last_known_title = "Unknown"
            last_known_cookies = []

            elapsed = 0
            closed_by_user = False

            while elapsed < MAX_WAIT_SECONDS:
                try:
                    if page.is_closed():
                        closed_by_user = True
                        break

                    last_known_url = page.url
                    last_known_html = _safe_html(page)
                    last_known_title = _safe_title(page)
                    last_known_cookies = context.cookies()

                except Exception:
                    # Page/context became unusable mid-check (closing,
                    # crashed, browser killed) — treat as user-closed.
                    closed_by_user = True
                    break

                try:
                    page.wait_for_timeout(1000)
                except Exception:
                    closed_by_user = True
                    break

                elapsed += 1

            if closed_by_user:
                print("Browser closed — finishing analysis.")
            else:
                print(f"Reached the {MAX_WAIT_SECONDS}s safety limit — closing automatically.")

            response_time = round((time.time() - start) * 1000)

            html = last_known_html
            page_title = last_known_title
            login_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            browser_name = browser.browser_type.name
            current_url = last_known_url
            cookie_list = last_known_cookies

            session_cookie_count = len(cookie_list)

            page_text = html.lower()  # last_known_html already captured while page was live

            blocked_by_provider = any(
                keyword in page_text
                for keyword in BLOCKED_BY_PROVIDER_KEYWORDS
            )

            login_failed_keywords_hit = any(
                keyword in page_text for keyword in FAILURE_KEYWORDS
            )

            login_success = (
                not blocked_by_provider
                and not nav_error
                and current_url != url
                and not login_failed_keywords_hit
            )

            cookies = {}
            for cookie in cookie_list:
                try:
                    cookies[cookie["name"]] = cookie["value"]
                except Exception:
                    continue

            # Parse defensively — malformed/partial HTML (common on a
            # provider block page) should degrade to an empty soup, not
            # raise.
            try:
                soup = BeautifulSoup(html, "html.parser") if html else BeautifulSoup("", "html.parser")
            except Exception:
                soup = BeautifulSoup("", "html.parser")

            result = {
                "url": url,
                "current_url": current_url,
                "page_title": page_title,
                "login_timestamp": login_timestamp,
                "browser": browser_name,
                "session_cookie_count": session_cookie_count,
                "login_success": login_success,
                "blocked_by_provider": blocked_by_provider,
                "closed_by_user": closed_by_user,
                "scan_status": (
                    "blocked_by_provider" if blocked_by_provider
                    else "navigation_error" if nav_error
                    else "ok"
                ),
                "scan_error": nav_error,
                "status_code": response.status if response else None,
                "headers": dict(response.headers) if response else {},
                "cookies": cookies,
                "response_time": response_time,
                "redirects": [],
                # Raw GPS fix from the browser's own geolocation API, if
                # available — reverse-geocoded into a neighbourhood-level
                # place name by signal_collector.py.
                "browser_geolocation": browser_geolocation,
                # NOTE: "html" is kept for internal signal-collection only —
                # it is stripped out before anything is returned to the API
                # response (see signal_collector.py) and is never JSON-
                # serialized directly, which was the source of the 500s.
                "html": html,
                "soup": soup,
            }

            try:
                if not page.is_closed():
                    browser.close()
            except Exception:
                pass

            return result

    except Exception as exc:
        # Absolute last-resort safety net: browser failed to launch, the
        # whole context crashed, etc. Still return a well-formed result
        # instead of letting FastAPI turn this into a 500.
        if browser:
            try:
                browser.close()
            except Exception:
                pass

        return {
            "url": url,
            "current_url": url,
            "page_title": "Unknown",
            "login_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "browser": "Unknown",
            "session_cookie_count": 0,
            "login_success": False,
            "blocked_by_provider": False,
            "scan_status": "fatal_error",
            "scan_error": str(exc),
            "status_code": None,
            "headers": {},
            "cookies": {},
            "response_time": round((time.time() - start) * 1000),
            "redirects": [],
            "html": "",
            "soup": BeautifulSoup("", "html.parser"),
        }