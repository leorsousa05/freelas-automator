import httpx
import asyncio
from app.config import settings

TWOCAPTCHA_API = "http://2captcha.com"


async def solve_turnstile(site_key: str, page_url: str, timeout: int = 60) -> str | None:
    """Solve Cloudflare Turnstile via 2captcha."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{TWOCAPTCHA_API}/in.php",
            data={
                "key": settings.twocaptcha_api_key,
                "method": "turnstile",
                "sitekey": site_key,
                "pageurl": page_url,
                "json": 1,
            },
        )
        data = resp.json()
        if data.get("status") != 1:
            return None
        captcha_id = data["request"]

        for _ in range(timeout):
            await asyncio.sleep(5)
            result = await client.get(
                f"{TWOCAPTCHA_API}/res.php",
                params={
                    "key": settings.twocaptcha_api_key,
                    "action": "get",
                    "id": captcha_id,
                    "json": 1,
                },
            )
            result_data = result.json()
            if result_data.get("status") == 1:
                return result_data["request"]
            if result_data.get("request") == "CAPCHA_NOT_READY":
                continue
            return None
        return None
