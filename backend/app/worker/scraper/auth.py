import json
import asyncio
import logging
from app.worker.pool import get_context, mark_login, is_login_fresh
from app.worker.captcha import solve_turnstile
from app.encryption import decrypt
from .constants import LOGIN_URL, TURNSTILE_SITE_KEY

logger = logging.getLogger(__name__)


async def ensure_logged_in(
    account_id: str,
    username: str,
    encrypted_password: str,
    cookies_json: str | None,
) -> tuple:
    """Ensure the browser page is logged in to 99freelas.

    Returns (page, cookies_json) where cookies_json is the updated session cookies.
    """
    logger.info("[LOGIN] Starting ensure_logged_in for account=%s user=%s", account_id, username)
    context = await get_context(account_id)
    page = await context.new_page()
    logger.info("[LOGIN] Browser context + new page created")

    # Fast path: if we logged in recently, just add cookies and go
    if is_login_fresh(account_id) and cookies_json:
        logger.info("[LOGIN] Fast path: login is fresh, adding cookies")
        try:
            cookies = json.loads(cookies_json)
            await context.add_cookies(cookies)
            mark_login(account_id)
            logger.info("[LOGIN] Fast path SUCCESS, returning")
            return page, cookies_json
        except Exception as e:
            logger.warning("[LOGIN] Fast path failed: %s", e)

    # Try restoring session from cookies
    if cookies_json:
        logger.info("[LOGIN] Trying cookie restore")
        try:
            cookies = json.loads(cookies_json)
            await context.add_cookies(cookies)
            await page.goto("https://www.99freelas.com.br/projects")
            await page.wait_for_load_state("networkidle")
            if "login" not in page.url:
                mark_login(account_id)
                logger.info("[LOGIN] Cookie restore SUCCESS (url=%s)", page.url)
                return page, cookies_json
            else:
                logger.warning("[LOGIN] Cookie restore failed: still on login page")
        except Exception as e:
            logger.warning("[LOGIN] Cookie restore error: %s", e)

    # Need to login — go fast to avoid token expiry
    logger.info("[LOGIN] Going to login page %s", LOGIN_URL)
    await page.goto(LOGIN_URL)
    await page.wait_for_selector("#email", timeout=15000)
    await page.wait_for_selector("#senha", timeout=15000)
    logger.info("[LOGIN] Login form visible, filling credentials")

    await page.fill("#email", username)
    await page.fill("#senha", decrypt(encrypted_password))

    # Check for Cloudflare Turnstile captcha and solve immediately before token expires
    logger.info("[LOGIN] Checking for captcha...")
    try:
        turnstile = page.locator(".cf-turnstile").first
        if await turnstile.is_visible(timeout=5000):
            logger.info("[LOGIN] Captcha visible, solving with 2captcha...")
            token = await solve_turnstile(TURNSTILE_SITE_KEY, LOGIN_URL)
            if token:
                logger.info("[LOGIN] Captcha solved, injecting token")
                await page.evaluate(
                    f"""
                    (() => {{
                        const token = "{token}";
                        if (typeof turnstile !== "undefined") {{
                            turnstile.getResponse = function() {{ return token; }};
                        }} else {{
                            window.turnstile = {{
                                getResponse: function() {{ return token; }},
                                ready: function(fn) {{ fn(); }},
                                render: function() {{}},
                                reset: function() {{}}
                            }};
                        }}
                    }})()
                    """
                )
        else:
            logger.info("[LOGIN] No captcha visible")
    except Exception as e:
        logger.warning("[LOGIN] Captcha check error: %s", e)

    logger.info("[LOGIN] Clicking login button...")
    await page.click("#btnEfetuarLogin")

    # Wait for navigation away from login page (success) or detect error
    try:
        await page.wait_for_url(lambda url: "login" not in url, timeout=15000)
        logger.info("[LOGIN] Navigation away from login detected")
    except Exception:
        await asyncio.sleep(2)
        if "login" in page.url:
            logger.error("[LOGIN] Login FAILED for %s (still on login page)", username)
            await page.close()
            raise Exception("Login failed for " + username)

    # Save cookies
    mark_login(account_id)
    cookies = await context.cookies()
    logger.info("[LOGIN] Login SUCCESS for %s, cookies saved", username)
    return page, json.dumps(cookies)
