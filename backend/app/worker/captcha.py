import httpx
import asyncio
from app.config import settings

TWOCAPTCHA_API = "http://2captcha.com"


async def solve_recaptcha(site_key: str, page_url: str, timeout: int = 60) -> str | None:
    async with httpx.AsyncClient() as client:
        # Request captcha solve
        resp = await client.post(
            f"{TWOCAPTCHA_API}/in.php",
            data={
                "key": settings.twocaptcha_api_key,
                "method": "userrecaptcha",
                "googlekey": site_key,
                "pageurl": page_url,
                "json": 1,
            },
        )
        data = resp.json()
        if data.get("status") != 1:
            return None
        captcha_id = data["request"]

        # Poll for result
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
