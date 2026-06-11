import asyncio
import re
import logging
from datetime import datetime
from decimal import Decimal
from bs4 import BeautifulSoup
from playwright.async_api import Page
from .constants import BASE_URL
from .parsers import parse_info_text, parse_budget, parse_brl

logger = logging.getLogger(__name__)


async def scrape_projects(page, category_slug: str | None = None, page_num: int = 1) -> list[dict]:
    """Scrape project list from /projects with optional category filter and pagination."""
    params = []
    if category_slug:
        params.append(f"categoria={category_slug}")
    if page_num and page_num > 1:
        params.append(f"page={page_num}")
    query = "?" + "&".join(params) if params else ""
    url = f"https://www.99freelas.com.br/projects{query}"
    logger.info("[SCRAPE-LIST] Navigating to %s", url)

    await page.goto(url, timeout=60000)
    try:
        await page.wait_for_load_state("networkidle", timeout=60000)
    except Exception:
        pass
    await asyncio.sleep(2)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")
    items = soup.select("ul.result-list > li.result-item")
    logger.info("[SCRAPE-LIST] Found %d project items on page", len(items))
    projects = []

    for item in items:
        external_id = item.get("data-id", "")
        title_el = item.select_one("h1.title a")
        title = title_el.get_text(strip=True) if title_el else ""
        href = title_el["href"] if title_el else ""
        url = f"{BASE_URL}{href}" if href else ""

        desc_el = item.select_one("div.description.formatted-text")
        description = desc_el.get_text(strip=True) if desc_el else ""

        info_el = item.select_one("p.information")
        info_text = info_el.get_text(strip=True) if info_el else ""
        info = parse_info_text(info_text)

        client_el = item.select_one("p.client")
        client_text = ""
        client_rating = None
        client_reviews_count = None
        if client_el:
            # Clone the element so we can remove rating spans without affecting the soup
            from copy import deepcopy
            client_clone = deepcopy(client_el)
            for star in client_clone.select("span.avaliacoes-star"):
                star.decompose()
            for text_span in client_clone.select("span.avaliacoes-text"):
                text_span.decompose()

            client_link = client_clone.select_one("a")
            if client_link:
                client_text = client_link.get_text(strip=True)
            else:
                full_text = client_clone.get_text(strip=True).replace("Cliente:", "").strip()
                full_text = re.sub(r'\(Sem feedback\)', '', full_text)
                client_text = full_text.strip()

            # rating from original element
            star_el = client_el.select_one("span.avaliacoes-star")
            if star_el and star_el.has_attr("data-score"):
                try:
                    client_rating = Decimal(star_el["data-score"])
                except Exception:
                    pass
            # reviews count from original element text
            reviews_match = re.search(r'\((\d+)\s+avalia(?:ção|ções)\)', client_el.get_text(strip=True))
            if reviews_match:
                try:
                    client_reviews_count = int(reviews_match.group(1))
                except Exception:
                    pass

        skills = []
        hab_el = item.select_one("p.habilidades")
        if hab_el:
            skills = [a.get_text(strip=True) for a in hab_el.select("a.habilidade")]

        # flags
        is_exclusive = bool(item.select_one("img[alt='Projeto exclusivo']") or item.select_one("img[title^='Projeto Exclusivo']"))
        is_urgent = bool(item.select_one("img[alt='Projeto urgente']") or item.select_one("img[title^='Projeto Urgente']"))

        # deadline from time-remaining element
        deadline = None
        time_remaining = info.get("time_remaining", "")
        tr_el = item.select_one("b.datetime-restante")
        if tr_el and tr_el.has_attr("cp-datetime"):
            try:
                ts_ms = int(tr_el["cp-datetime"])
                deadline = datetime.utcfromtimestamp(ts_ms / 1000)
            except (ValueError, OverflowError):
                pass

        projects.append({
            "external_id": external_id,
            "title": title,
            "description": description,
            "url": url,
            "category": info["category"],
            "subcategory": info["category"],
            "experience_level": info["experience_level"],
            "proposals_count": info["proposals_count"],
            "interested_count": info["interested_count"],
            "published_at": info["published_at"],
            "time_remaining": time_remaining,
            "client_name": client_text,
            "client_rating": client_rating,
            "client_reviews_count": client_reviews_count,
            "skills": skills,
            "is_featured": bool(item.select_one("img[alt='Projeto destaque']") or item.select_one("img[title='Projeto em Destaque']")),
            "is_exclusive": is_exclusive,
            "is_urgent": is_urgent,
            "deadline": deadline,
        })
    logger.info("[SCRAPE-LIST] Parsed %d projects", len(projects))
    return projects


async def scrape_project_detail(page, project_path: str) -> dict | None:
    """Scrape detailed project info from a project page (e.g. /project/...-12345)."""
    url = f"{BASE_URL}{project_path}" if project_path.startswith('/') else project_path
    logger.info("[SCRAPE-DETAIL] Navigating to %s", url)
    await page.goto(url, timeout=60000)
    try:
        await page.wait_for_load_state("domcontentloaded", timeout=30000)
    except Exception:
        pass
    await asyncio.sleep(2)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")

    title_el = soup.select_one("span.nomeProjeto")
    title = title_el.get_text(strip=True) if title_el else ""

    desc_el = soup.select_one("div.project-description.formatted-text")
    description = desc_el.get_text(strip=True) if desc_el else ""

    rows = soup.select(".info-adicionais table tr")
    data = {}
    for row in rows:
        th = row.select_one("th")
        td = row.select_one("td")
        if th and td:
            key = th.get_text(strip=True).rstrip(':').lower()
            data[key] = td.get_text(strip=True)

    budget_min, budget_max = parse_budget(data.get('orçamento', ''))

    valor_min = None
    valor_min_el = soup.select_one(".valor-minimo")
    if valor_min_el:
        try:
            valor_min = parse_brl(valor_min_el.get_text(strip=True).replace('R$', '').strip())
        except Exception:
            pass

    client_el = soup.select_one(".info-usuario.cliente .name")
    client_name = client_el.get_text(strip=True) if client_el else ""

    client_avatar_el = soup.select_one(".info-usuario.cliente .info-usuario-imagem img")
    client_avatar = client_avatar_el.get("src", "") if client_avatar_el else ""

    client_rating = None
    client_star_el = soup.select_one(".info-usuario.cliente .avaliacoes-star")
    if client_star_el and client_star_el.has_attr("data-score"):
        try:
            client_rating = Decimal(client_star_el["data-score"])
        except Exception:
            pass

    published_at = ""
    pub_el = soup.select_one("span.data-hora.icon-published")
    if pub_el:
        published_at = pub_el.get_text(strip=True)

    client_last_seen = ""
    ativ_el = soup.select_one(".container-atividades-cliente")
    if ativ_el:
        last_seen_el = ativ_el.find("p", string=re.compile(r"Última visualização:"))
        if last_seen_el:
            m = re.search(r"Última visualização:\s*(.+)", last_seen_el.get_text(strip=True))
            if m:
                client_last_seen = m.group(1).strip()

    is_featured = bool(soup.select_one("img[alt='Projeto destaque']") or soup.select_one("img[title='Projeto em Destaque.']"))

    allows_multiple = False
    multi_el = soup.select_one("input.info-permite-varios-freelancers")
    if multi_el and multi_el.has_attr("value"):
        allows_multiple = multi_el["value"].lower() == "true"

    proposals_count = None
    if 'propostas' in data:
        try:
            proposals_count = int(data['propostas'])
        except ValueError:
            pass

    interested_count = None
    if 'interessados' in data:
        try:
            interested_count = int(data['interessados'])
        except ValueError:
            pass

    deadline = None
    deadline_el = soup.select_one(".datetime-restante")
    if deadline_el and deadline_el.has_attr('cp-datetime'):
        try:
            ts_ms = int(deadline_el['cp-datetime'])
            deadline = datetime.utcfromtimestamp(ts_ms / 1000)
        except (ValueError, OverflowError):
            pass

    result = {
        "external_id": "",
        "title": title,
        "description": description,
        "url": url,
        "category": data.get('categoria', ''),
        "subcategory": data.get('subcategoria', ''),
        "budget_min": budget_min or valor_min,
        "budget_max": budget_max,
        "experience_level": data.get('nível de experiência', ''),
        "proposals_count": proposals_count,
        "interested_count": interested_count,
        "client_name": client_name,
        "client_avatar": client_avatar,
        "client_rating": client_rating,
        "client_last_seen": client_last_seen,
        "visibility": data.get('visibilidade', ''),
        "published_at": published_at,
        "is_featured": is_featured,
        "allows_multiple_freelancers": allows_multiple,
        "deadline": deadline,
    }
    logger.info(
        "[SCRAPE-DETAIL] title=%s category=%s subcategory=%s featured=%s proposals=%s client=%s",
        title, result["category"], result["subcategory"], is_featured, proposals_count, client_name
    )
    return result


def _parse_proposals_from_soup(soup) -> list[dict]:
    """Parse proposal items from a BeautifulSoup object (used by both scrapers)."""
    items = soup.select(".proposal-list .proposal-item")
    proposals = []

    for item in items:
        name_el = item.select_one(".info-usuario-dados .name")
        freelancer_name = name_el.get_text(strip=True) if name_el else ""

        nick_el = item.select_one("input.freelancer-nickname")
        freelancer_nickname = nick_el["value"] if nick_el and nick_el.has_attr("value") else ""

        avatar_el = item.select_one(".info-usuario-imagem img")
        freelancer_avatar = avatar_el.get("src", "") if avatar_el else ""

        freelancer_rating = None
        star_el = item.select_one(".avaliacoes-star")
        if star_el and star_el.has_attr("data-score"):
            try:
                freelancer_rating = Decimal(star_el["data-score"])
            except Exception:
                pass

        is_premium = bool(item.select_one("img[alt='Freelancer Premium']") or item.select_one("img[title='Freelancer Premium']"))
        is_pro = bool(item.select_one("img[alt='Freelancer Pro']") or item.select_one("img[title='Freelancer Pro']"))
        is_identity_verified = bool(item.select_one("img.icon-identity"))

        badges = []
        for badge_el in item.select(".proposal-header-options .status-proposta"):
            badge_text = badge_el.get_text(strip=True)
            classes = badge_el.get("class", [])
            if "show" in classes or badge_text:
                if "show" in classes:
                    badges.append(badge_text)

        status = "sent"
        for b in badges:
            if b in ("Aceita",):
                status = "accepted"
            elif b in ("Rejeitada",):
                status = "rejected"
            elif b in ("Aguardando avaliação",):
                status = "pending"

        info_el = item.select_one("p.proposal-info")
        info_text = info_el.get_text(strip=True) if info_el else ""

        submitted_at = ""
        offer_value = None
        final_value = None
        duration = None

        if info_text:
            m = re.search(r"Submetido:\s*<b[^>]*>(.*?)</b>", str(info_el))
            if m:
                submitted_at = m.group(1).strip()
            else:
                m = re.search(r"Submetido:\s*(.+?)(?=\||$)", info_text)
                if m:
                    submitted_at = m.group(1).strip()

            m = re.search(r"Oferta:\s*<b[^>]*>(.*?)</b>", str(info_el))
            if m:
                offer_text = m.group(1).strip()
                if offer_text.lower() != "privado":
                    try:
                        offer_value = parse_brl(offer_text.replace('R$', '').strip())
                    except Exception:
                        pass
            else:
                m = re.search(r"Oferta:\s*R?\$?\s*([\d.,]+)", info_text)
                if m:
                    try:
                        offer_value = parse_brl(m.group(1))
                    except Exception:
                        pass

            m = re.search(r"Oferta Final:\s*<b[^>]*>(.*?)</b>", str(info_el))
            if m:
                final_text = m.group(1).strip()
                if final_text.lower() != "privado":
                    try:
                        final_value = parse_brl(final_text.replace('R$', '').strip())
                    except Exception:
                        pass
            else:
                m = re.search(r"Oferta Final:\s*R?\$?\s*([\d.,]+)", info_text)
                if m:
                    try:
                        final_value = parse_brl(m.group(1))
                    except Exception:
                        pass

            m = re.search(r"Duração estimada:\s*<b[^>]*>(.*?)</b>", str(info_el))
            if m:
                dur_text = m.group(1).strip()
                if dur_text.lower() != "privado":
                    m2 = re.search(r"(\d+)", dur_text)
                    if m2:
                        duration = int(m2.group(1))
            else:
                m = re.search(r"Duração estimada:\s*(\d+)", info_text)
                if m:
                    duration = int(m.group(1))

        proposals.append({
            "freelancer_name": freelancer_name,
            "freelancer_nickname": freelancer_nickname,
            "freelancer_avatar": freelancer_avatar,
            "freelancer_rating": freelancer_rating,
            "is_premium": is_premium,
            "is_pro": is_pro,
            "is_identity_verified": is_identity_verified,
            "status": status,
            "status_badges": badges,
            "submitted_at": submitted_at,
            "offer_value": offer_value,
            "final_value": final_value,
            "duration_days": duration,
            "info": info_text,
        })
    return proposals


async def scrape_project_full(page, project_path: str) -> dict:
    """Scrape both detail and proposals in a single page navigation."""
    url = f"{BASE_URL}{project_path}" if project_path.startswith('/') else project_path
    logger.info("[SCRAPE-FULL] Navigating to %s", url)
    await page.goto(url, timeout=60000)
    try:
        await page.wait_for_load_state("domcontentloaded", timeout=30000)
    except Exception:
        pass
    await asyncio.sleep(2)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")

    title_el = soup.select_one("span.nomeProjeto")
    title = title_el.get_text(strip=True) if title_el else ""

    desc_el = soup.select_one("div.project-description.formatted-text")
    description = desc_el.get_text(strip=True) if desc_el else ""

    rows = soup.select(".info-adicionais table tr")
    data = {}
    for row in rows:
        th = row.select_one("th")
        td = row.select_one("td")
        if th and td:
            key = th.get_text(strip=True).rstrip(':').lower()
            data[key] = td.get_text(strip=True)

    budget_min, budget_max = parse_budget(data.get('orçamento', ''))

    valor_min = None
    valor_min_el = soup.select_one(".valor-minimo")
    if valor_min_el:
        try:
            valor_min = parse_brl(valor_min_el.get_text(strip=True).replace('R$', '').strip())
        except Exception:
            pass

    client_el = soup.select_one(".info-usuario.cliente .name")
    client_name = client_el.get_text(strip=True) if client_el else ""

    client_avatar_el = soup.select_one(".info-usuario.cliente .info-usuario-imagem img")
    client_avatar = client_avatar_el.get("src", "") if client_avatar_el else ""

    client_rating = None
    client_star_el = soup.select_one(".info-usuario.cliente .avaliacoes-star")
    if client_star_el and client_star_el.has_attr("data-score"):
        try:
            client_rating = Decimal(client_star_el["data-score"])
        except Exception:
            pass

    published_at = ""
    pub_el = soup.select_one("span.data-hora.icon-published")
    if pub_el:
        published_at = pub_el.get_text(strip=True)

    client_last_seen = ""
    ativ_el = soup.select_one(".container-atividades-cliente")
    if ativ_el:
        last_seen_el = ativ_el.find("p", string=re.compile(r"Última visualização:"))
        if last_seen_el:
            m = re.search(r"Última visualização:\s*(.+)", last_seen_el.get_text(strip=True))
            if m:
                client_last_seen = m.group(1).strip()

    is_featured = bool(soup.select_one("img[alt='Projeto destaque']") or soup.select_one("img[title='Projeto em Destaque.']"))

    allows_multiple = False
    multi_el = soup.select_one("input.info-permite-varios-freelancers")
    if multi_el and multi_el.has_attr("value"):
        allows_multiple = multi_el["value"].lower() == "true"

    proposals_count = None
    if 'propostas' in data:
        try:
            proposals_count = int(data['propostas'])
        except ValueError:
            pass

    interested_count = None
    if 'interessados' in data:
        try:
            interested_count = int(data['interessados'])
        except ValueError:
            pass

    deadline = None
    deadline_el = soup.select_one(".datetime-restante")
    if deadline_el and deadline_el.has_attr('cp-datetime'):
        try:
            ts_ms = int(deadline_el['cp-datetime'])
            deadline = datetime.utcfromtimestamp(ts_ms / 1000)
        except (ValueError, OverflowError):
            pass

    detail = {
        "external_id": "",
        "title": title,
        "description": description,
        "url": url,
        "category": data.get('categoria', ''),
        "subcategory": data.get('subcategoria', ''),
        "budget_min": budget_min or valor_min,
        "budget_max": budget_max,
        "experience_level": data.get('nível de experiência', ''),
        "proposals_count": proposals_count,
        "interested_count": interested_count,
        "client_name": client_name,
        "client_avatar": client_avatar,
        "client_rating": client_rating,
        "client_last_seen": client_last_seen,
        "visibility": data.get('visibilidade', ''),
        "published_at": published_at,
        "is_featured": is_featured,
        "allows_multiple_freelancers": allows_multiple,
        "deadline": deadline,
    }

    proposals = _parse_proposals_from_soup(soup)

    logger.info(
        "[SCRAPE-FULL] title=%s proposals=%d detail+proposals in one nav",
        title, len(proposals)
    )
    return {"detail": detail, "proposals": proposals}
