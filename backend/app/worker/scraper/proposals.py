import asyncio
import logging
from bs4 import BeautifulSoup
from .constants import BASE_URL
from .projects import _parse_proposals_from_soup

logger = logging.getLogger(__name__)


async def scrape_project_proposals(page, external_id: str, project_url: str | None = None) -> list[dict]:
    """Scrape proposals from a specific project page."""
    url = project_url.split("?")[0] if project_url else f"{BASE_URL}/project/{external_id}"
    logger.info("[SCRAPE-PROPOSALS] Navigating to %s", url)
    await page.goto(url, timeout=60000)
    try:
        await page.wait_for_load_state("domcontentloaded", timeout=30000)
    except Exception:
        pass
    await asyncio.sleep(2)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")
    proposals = _parse_proposals_from_soup(soup)
    logger.info("[SCRAPE-PROPOSALS] Parsed %d proposals", len(proposals))
    return proposals
