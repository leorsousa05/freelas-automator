from playwright.async_api import async_playwright, Browser, BrowserContext
from app.config import settings

_browser: Browser | None = None
_contexts: dict[str, BrowserContext] = {}
_playwright = None


async def get_browser() -> Browser:
    global _browser, _playwright
    if _browser is None:
        _playwright = await async_playwright().start()
        _browser = await _playwright.chromium.launch(
            headless=settings.playwright_headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
    return _browser


async def get_context(account_id: str) -> BrowserContext:
    if account_id in _contexts:
        return _contexts[account_id]
    browser = await get_browser()
    context = await browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    )
    _contexts[account_id] = context
    return context


async def close_context(account_id: str):
    if account_id in _contexts:
        await _contexts[account_id].close()
        del _contexts[account_id]


async def close_browser():
    global _browser, _playwright
    for ctx in list(_contexts.values()):
        await ctx.close()
    _contexts.clear()
    if _browser:
        await _browser.close()
        _browser = None
    if _playwright:
        await _playwright.stop()
        _playwright = None
