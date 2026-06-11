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


async def _get_hidden_input(page, selector: str, default: str = "") -> str:
    """Safely get the value of a hidden input, returning default if not found."""
    try:
        count = await page.locator(selector).count()
        if count == 0:
            return default
        return await page.locator(selector).input_value()
    except Exception:
        return default


async def send_proposal(
    page,
    external_id: str,
    slug: str,
    offer_value: str,
    final_value: str,
    duration_days: int,
    details: str,
) -> dict:
    """
    Fill and submit the 99freelas bid form.
    Navigates to the project page first, then clicks the bid link.

    Returns:
        dict with keys: success (bool), message (str), proposal_data (dict or None)
    """
    # Navigate to project page first
    project_url = f"{BASE_URL}/project/{slug}-{external_id}"
    logger.info("[SEND-PROPOSAL] Navigating to project page %s", project_url)
    await page.goto(project_url, timeout=60000)
    try:
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        pass
    await asyncio.sleep(2)

    # Check if already sent
    tem_proposta = await _get_hidden_input(page, "input.tem-proposta", "0")
    logger.info("[SEND-PROPOSAL] tem-proposta=%s", tem_proposta)
    if tem_proposta == "1":
        logger.warning("[SEND-PROPOSAL] Proposal already sent for project %s", external_id)
        return {"success": False, "message": "Você já enviou uma proposta para este projeto", "proposal_data": None}

    # Find and click the bid button/link
    bid_link_count = await page.locator("a[href*='bid/']").count()
    bid_button_count = await page.locator("a[href*='/project/bid/']").count()
    logger.info("[SEND-PROPOSAL] Bid links found: a[href*='bid/']=%d, a[href*='/project/bid/']=%d", bid_link_count, bid_button_count)

    if bid_button_count > 0:
        href = await page.locator("a[href*='/project/bid/']").first.get_attribute("href")
        logger.info("[SEND-PROPOSAL] Clicking bid link: %s", href)
        await page.locator("a[href*='/project/bid/']").first.click()
    elif bid_link_count > 0:
        href = await page.locator("a[href*='bid/']").first.get_attribute("href")
        logger.info("[SEND-PROPOSAL] Clicking bid link: %s", href)
        await page.locator("a[href*='bid/']").first.click()
    else:
        # Fallback: navigate directly to bid URL
        bid_url = f"{BASE_URL}/project/bid/{slug}-{external_id}"
        logger.info("[SEND-PROPOSAL] No bid link found, navigating directly to %s", bid_url)
        await page.goto(bid_url, timeout=60000)

    try:
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        pass
    await asyncio.sleep(3)

    logger.info("[SEND-PROPOSAL] Current URL after bid navigation: %s", page.url)

    # Check if bid form exists
    oferta_count = await page.locator("#oferta").count()
    if oferta_count == 0:
        html_debug = await page.content()
        soup = BeautifulSoup(html_debug, "html.parser")
        # Check for exclusive project message
        exclusive_msg = soup.select_one(".content-box-message.fail")
        if exclusive_msg and "exclusivos" in exclusive_msg.get_text():
            text = exclusive_msg.get_text(strip=True)
            logger.error("[SEND-PROPOSAL] Exclusive project: %s", text)
            return {"success": False, "message": text, "proposal_data": None}
        # Check for generic access error
        title = soup.select_one("title")
        if title and "Não foi possível acessar" in title.get_text():
            logger.error("[SEND-PROPOSAL] Access denied to bid page")
            return {"success": False, "message": "Não foi possível acessar a página de proposta. O projeto pode ser exclusivo ou você já enviou uma proposta.", "proposal_data": None}
        logger.error("[SEND-PROPOSAL] Bid form not found on page")
        with open(f"/tmp/send_proposal_debug_{external_id}.html", "w") as f:
            f.write(html_debug)
        logger.error("[SEND-PROPOSAL] HTML saved to /tmp/send_proposal_debug_%s.html", external_id)
        return {"success": False, "message": "Formulário de proposta não encontrado", "proposal_data": None}

    # Fill form fields
    logger.info("[SEND-PROPOSAL] Filling form fields")
    await page.locator("#oferta").fill(offer_value)
    await asyncio.sleep(0.5)
    await page.locator("#oferta-final").fill(final_value)
    await asyncio.sleep(0.5)
    await page.locator("#duracao-estimada").fill(str(duration_days))
    await asyncio.sleep(0.5)
    await page.locator("#proposta").fill(details)
    await asyncio.sleep(0.5)

    # Click submit
    logger.info("[SEND-PROPOSAL] Clicking submit button")
    await page.locator("#btnConcluirEnvioProposta").click()
    await asyncio.sleep(3)

    # Handle terms confirmation modal
    try:
        terms_modal = page.locator(".modal-confirmacao-proposta-pergunta")
        if await terms_modal.is_visible():
            logger.info("[SEND-PROPOSAL] Terms confirmation modal detected")
            await page.locator("#confirmar-envio-proposta").check()
            await asyncio.sleep(0.5)
            await terms_modal.locator(".btn-acao").click()
            await asyncio.sleep(3)
    except Exception as e:
        logger.debug("[SEND-PROPOSAL] Terms modal handling: %s", e)

    # Handle content moderation modal
    try:
        moderation_modal = page.locator(".modal-padrao-suspeito-mensagem")
        if await moderation_modal.is_visible():
            logger.info("[SEND-PROPOSAL] Content moderation modal detected")
            await page.locator("#confirmar-padrao-suspeito-mensagem").check()
            await asyncio.sleep(0.5)
            await moderation_modal.locator(".btn-acao").click()
            await asyncio.sleep(3)
    except Exception as e:
        logger.debug("[SEND-PROPOSAL] Moderation modal handling: %s", e)

    # Detect success
    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")

    # Check for error messages
    error_msg = soup.select_one(".general-error-msg .default-msg")
    if error_msg and error_msg.get_text(strip=True):
        text = error_msg.get_text(strip=True)
        logger.error("[SEND-PROPOSAL] Error after submit: %s", text)
        return {"success": False, "message": text, "proposal_data": None}

    # Check for error text in page
    error_text = soup.select_one(".general-error-msg")
    if error_text:
        text = error_text.get_text(strip=True)
        if text and text != "Por favor, complete os dados obrigatórios.":
            logger.error("[SEND-PROPOSAL] Error text: %s", text)
            return {"success": False, "message": text, "proposal_data": None}

    # Check for success toast or redirect to project page
    current_url = page.url
    if f"/project/{slug}-{external_id}" in current_url and "/bid/" not in current_url:
        logger.info("[SEND-PROPOSAL] Redirected to project page — success")
        return {"success": True, "message": "Proposta enviada com sucesso", "proposal_data": None}

    # Check for success message in page
    success_toast = soup.select_one(".general-msg-box.success .content")
    if success_toast:
        text = success_toast.get_text(strip=True)
        logger.info("[SEND-PROPOSAL] Success toast: %s", text)
        return {"success": True, "message": text, "proposal_data": None}

    # Check if still on bid page with no error — may have succeeded
    if "/project/bid/" in current_url:
        # Check if tem-proposta is now 1
        tem_proposta_after = await _get_hidden_input(page, "input.tem-proposta", "0")
        if tem_proposta_after == "1":
            logger.info("[SEND-PROPOSAL] tem-proposta=1 after submit — success")
            return {"success": True, "message": "Proposta enviada com sucesso", "proposal_data": None}

    logger.warning("[SEND-PROPOSAL] Unable to determine result for project %s", external_id)
    return {"success": False, "message": "Não foi possível confirmar o envio da proposta", "proposal_data": None}
