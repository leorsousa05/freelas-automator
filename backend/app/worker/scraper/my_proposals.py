import asyncio
import logging
from datetime import datetime
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


async def scrape_my_proposals(page) -> list[dict]:
    """Scrape proposals from /my-proposals.
    NOTE: Proposals are loaded dynamically; this parses whatever is in the initial HTML.
    """
    logger.info("[SCRAPE-MY-PROPOSALS] Navigating to /my-proposals")
    await page.goto("https://www.99freelas.com.br/my-proposals?limit=20")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(3)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")
    proposals = []

    items = soup.select("li.proposal-item:not(.model)")
    logger.info("[SCRAPE-MY-PROPOSALS] Found %d proposal items", len(items))
    for item in items:
        title_el = item.select_one("a[href^='/project/']")
        status_el = item.select_one(".status-proposta")
        proposals.append({
            "external_id": item.get("data-id", ""),
            "title": title_el.get_text(strip=True) if title_el else "",
            "status": status_el.get_text(strip=True) if status_el else "sent",
            "sent_at": datetime.utcnow(),
        })
    logger.info("[SCRAPE-MY-PROPOSALS] Parsed %d proposals", len(proposals))
    return proposals
