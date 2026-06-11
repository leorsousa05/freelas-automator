import asyncio
import logging
from .constants import BASE_URL

logger = logging.getLogger(__name__)


async def scrape_subscription_status(page) -> dict:
    """
    Check if the logged-in user has an active subscription.
    Navigates to /subscriptions and looks for active plan indicators.

    Returns:
        dict with keys: has_subscription (bool), plan_name (str | None)
    """
    url = f"{BASE_URL}/subscriptions"
    logger.info("[SUBSCRIPTION] Navigating to %s", url)
    await page.goto(url, timeout=60000)
    try:
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        pass
    await asyncio.sleep(2)

    html = await page.content()

    # Look for plan name or active subscription indicators
    # Common patterns: plan name in a box, "Plano Atual", "Renovar", etc.
    has_plan = False
    plan_name = None

    # Check for "Plano Atual" or plan name box
    plan_indicators = [
        ".plano-atual",
        ".plano-ativo",
        ".assinatura-ativa",
        ".box-plano",
        ".current-plan",
    ]
    for selector in plan_indicators:
        count = await page.locator(selector).count()
        if count > 0:
            has_plan = True
            try:
                plan_name = await page.locator(selector).first.inner_text()
                plan_name = plan_name.strip()[:100] if plan_name else None
            except Exception:
                pass
            break

    # Check page text for subscription-related terms
    if not has_plan:
        page_text = await page.inner_text("body")
        lower_text = page_text.lower()
        # If page says "assine" or "escolha seu plano" without showing current plan
        if "plano atual" in lower_text or "plano ativo" in lower_text or "assinatura ativa" in lower_text:
            has_plan = True
        elif "assine" in lower_text or "escolha seu plano" in lower_text:
            has_plan = False

    logger.info("[SUBSCRIPTION] has_plan=%s plan_name=%s", has_plan, plan_name)
    return {"has_subscription": has_plan, "plan_name": plan_name}
