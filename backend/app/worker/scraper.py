import json
import asyncio
from playwright.async_api import Page
from app.worker.pool import get_context
from app.worker.captcha import solve_recaptcha
from app.encryption import decrypt

LOGIN_URL = "https://www.99freelas.com.br/login"


async def ensure_logged_in(account_id: str, username: str, encrypted_password: str, cookies_json: str | None):
    context = await get_context(account_id)
    page = await context.new_page()

    # Try restoring session from cookies
    if cookies_json:
        try:
            cookies = json.loads(cookies_json)
            await context.add_cookies(cookies)
            await page.goto("https://www.99freelas.com.br/projects")
            await page.wait_for_load_state("networkidle")
            if "login" not in page.url:
                return page, cookies_json  # Still logged in
        except Exception:
            pass  # Cookies invalid, proceed to login

    # Need to login
    await page.goto(LOGIN_URL)
    await page.fill('input[name="username"]', username)
    await page.fill('input[name="password"]', decrypt(encrypted_password))

    # Check for captcha
    try:
        captcha_frame = page.locator('iframe[title="reCAPTCHA"]').first
        if await captcha_frame.is_visible(timeout=5000):
            # Extract sitekey from iframe src if possible
            # For now, use placeholder — real sitekey must be inspected on live site
            token = await solve_recaptcha("SITE_KEY_PLACEHOLDER", LOGIN_URL)
            if token:
                await page.evaluate(f'document.getElementById("g-recaptcha-response").innerHTML="{token}"')
    except Exception:
        pass  # No captcha or timeout

    await page.click('button[type="submit"]')
    await page.wait_for_load_state("networkidle")

    if "login" in page.url:
        await page.close()
        raise Exception("Login failed for " + username)

    # Save cookies
    cookies = await context.cookies()
    return page, json.dumps(cookies)
