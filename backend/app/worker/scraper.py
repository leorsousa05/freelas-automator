import json
import asyncio
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.async_api import Page
from app.database import SessionLocal
from app.models import Account, Project, Message, Proposal, ScrapingJob
from app.worker.pool import get_context, close_context
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


async def scrape_projects(page) -> list[dict]:
    await page.goto("https://www.99freelas.com.br/projects")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")
    projects = []

    # NOTE: These selectors are EXAMPLES. 99freelas may differ.
    # Inspect the real site and update selectors accordingly.
    for item in soup.select(".project-item"):
        title_el = item.select_one(".project-title a")
        budget_el = item.select_one(".project-budget")
        projects.append({
            "external_id": title_el["href"].split("/")[-1] if title_el else "",
            "title": title_el.get_text(strip=True) if title_el else "",
            "description": item.select_one(".project-description").get_text(strip=True) if item.select_one(".project-description") else "",
            "url": f"https://www.99freelas.com.br{title_el['href']}" if title_el else "",
            "budget_text": budget_el.get_text(strip=True) if budget_el else None,
        })
    return projects


async def scrape_messages(page) -> list[dict]:
    await page.goto("https://www.99freelas.com.br/messages")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")
    messages = []

    for item in soup.select(".message-item"):
        messages.append({
            "external_id": item.get("data-id", ""),
            "sender_name": item.select_one(".sender-name").get_text(strip=True) if item.select_one(".sender-name") else "",
            "content": item.select_one(".message-content").get_text(strip=True) if item.select_one(".message-content") else "",
            "received_at": datetime.utcnow(),
        })
    return messages


async def scrape_proposals(page) -> list[dict]:
    await page.goto("https://www.99freelas.com.br/proposals")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")
    proposals = []

    for item in soup.select(".proposal-item"):
        proposals.append({
            "external_id": item.get("data-id", ""),
            "value": None,
            "status": item.select_one(".proposal-status").get_text(strip=True) if item.select_one(".proposal-status") else "sent",
            "sent_at": datetime.utcnow(),
        })
    return proposals


async def run_full_sync(account_id: str, username: str, password_encrypted: str, cookies_json: str | None):
    db = SessionLocal()
    job = ScrapingJob(account_id=account_id, job_type="full_sync", status="running", started_at=datetime.utcnow())
    db.add(job)
    db.commit()
    db.refresh(job)

    items_scraped = 0
    page = None
    try:
        page, new_cookies = await ensure_logged_in(account_id, username, password_encrypted, cookies_json)

        # Update account cookies
        account = db.query(Account).filter(Account.id == account_id).first()
        if account:
            account.session_cookies = new_cookies
            account.last_login_at = datetime.utcnow()

        # Scrape projects
        projects = await scrape_projects(page)
        for p in projects:
            db.merge(Project(
                account_id=account_id,
                external_id=p["external_id"],
                title=p["title"],
                description=p.get("description"),
                url=p.get("url"),
                scraped_at=datetime.utcnow(),
            ))
        items_scraped += len(projects)

        # Scrape messages
        messages = await scrape_messages(page)
        for m in messages:
            db.merge(Message(
                account_id=account_id,
                external_id=m["external_id"],
                sender_name=m.get("sender_name"),
                content=m.get("content"),
                received_at=m.get("received_at"),
            ))
        items_scraped += len(messages)

        # Scrape proposals
        proposals = await scrape_proposals(page)
        for pr in proposals:
            db.merge(Proposal(
                account_id=account_id,
                external_id=pr["external_id"],
                status=pr.get("status", "sent"),
                sent_at=pr.get("sent_at"),
            ))
        items_scraped += len(proposals)

        db.commit()
        job.status = "success"
        job.items_scraped = items_scraped
    except Exception as e:
        db.rollback()
        job.status = "failed"
        job.error_message = str(e)[:1000]
        await close_context(account_id)
    finally:
        job.finished_at = datetime.utcnow()
        db.commit()
        db.close()
        if page:
            await page.close()
