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

            print("=" * 60)
            print("Waiting for login to complete...")
            print("=" * 60)

            original_url = url
            for _ in range(120):  # Wait up to 120 seconds
                try:
                    page.wait_for_timeout(1000)
                    if page.url != original_url:
                        print("Login detected!")
                        break
                except Exception:
                    break

            response_time = round((time.time() - start) * 1000)

            html = _safe_html(page)
            page_title = _safe_title(page)
            login_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            browser_name = browser.browser_type.name

            try:
                current_url = page.url
            except Exception:
                current_url = url

            try:
                cookie_list = context.cookies()
            except Exception:
                cookie_list = []

            session_cookie_count = len(cookie_list)

            page_text = _safe_page_text(page)

            blocked_by_provider = any(
                keyword in page_text or keyword in html.lower()
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
                # NOTE: "html" is kept for internal signal-collection only —
                # it is stripped out before anything is returned to the API
                # response (see signal_collector.py) and is never JSON-
                # serialized directly, which was the source of the 500s.
                "html": html,
                "soup": soup,
            }

            browser.close()
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