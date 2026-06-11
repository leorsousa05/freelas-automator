import asyncio
import json
import logging
from app.worker.pool import get_browser
from app.worker.captcha import solve_turnstile
from app.encryption import decrypt
from .constants import LOGIN_URL, TURNSTILE_SITE_KEY

logger = logging.getLogger(__name__)

PLATFORMS = {
    "99freelas": {
        "login_url": "https://www.99freelas.com.br/login",
        "email_selector": "#email",
        "password_selector": "#senha",
        "submit_selector": "#btnEfetuarLogin",
        "success_check": lambda url: "login" not in url,
    },
}


async def test_credentials(platform: str, username: str, encrypted_password: str) -> dict:
    """Test login credentials without saving anything to the database.

    Returns {"success": bool, "message": str}
    """
    if platform not in PLATFORMS:
        return {"success": False, "message": f"Plataforma '{platform}' não suportada."}

    cfg = PLATFORMS[platform]
    browser = await get_browser()
    context = await browser.new_context()
    page = await context.new_page()

    try:
        logger.info("[TEST-LOGIN] Testing %s for user=%s", platform, username)
        await page.goto(cfg["login_url"])
        await page.wait_for_selector(cfg["email_selector"], timeout=15000)
        await page.wait_for_selector(cfg["password_selector"], timeout=15000)

        await page.fill(cfg["email_selector"], username)
        await page.fill(cfg["password_selector"], decrypt(encrypted_password))

        # Captcha
        try:
            turnstile = page.locator(".cf-turnstile").first
            if await turnstile.is_visible(timeout=5000):
                token = await solve_turnstile(TURNSTILE_SITE_KEY, cfg["login_url"])
                if token:
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
        except Exception as e:
            logger.warning("[TEST-LOGIN] Captcha check error: %s", e)

        await page.click(cfg["submit_selector"])

        try:
            await page.wait_for_url(lambda url: cfg["success_check"](url), timeout=15000)
            logger.info("[TEST-LOGIN] SUCCESS for %s", username)
            return {"success": True, "message": "Login válido."}
        except Exception:
            await asyncio.sleep(2)
            if not cfg["success_check"](page.url):
                logger.error("[TEST-LOGIN] FAILED for %s (still on login page)", username)
                return {"success": False, "message": "Usuário ou senha incorretos."}
            return {"success": True, "message": "Login válido."}
    except Exception as e:
        logger.error("[TEST-LOGIN] ERROR for %s: %s", username, e)
        return {"success": False, "message": f"Erro ao testar login: {str(e)}"}
    finally:
        await context.close()
