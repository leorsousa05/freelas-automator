import logging
from uuid import UUID
from datetime import datetime
from app.database import SessionLocal
from app.models import Account, Project, Conversation, Proposal, ScrapingJob
from app.worker.pool import close_context
from app.crud import upsert_conversation
from .auth import ensure_logged_in
from .projects import scrape_projects
from .messages import scrape_conversations
from .my_proposals import scrape_my_proposals

logger = logging.getLogger(__name__)


async def run_full_sync(job_id: str, account_id: str, username: str, password_encrypted: str, cookies_json: str | None):
    logger.info("[SYNC] Starting full_sync job=%s account=%s user=%s", job_id, account_id, username)
    db = SessionLocal()
    job_uuid = UUID(job_id) if isinstance(job_id, str) else job_id
    acc_uuid = UUID(account_id) if isinstance(account_id, str) else account_id
    job = db.query(ScrapingJob).filter(ScrapingJob.id == job_uuid).first()
    if not job:
        logger.error("[SYNC] Job %s not found", job_id)
        db.close()
        return
    job.status = "running"
    job.started_at = datetime.utcnow()
    db.commit()

    items_scraped = 0
    page = None
    try:
        page, new_cookies = await ensure_logged_in(account_id, username, password_encrypted, cookies_json)

        account = db.query(Account).filter(Account.id == acc_uuid).first()
        if account:
            account.session_cookies = new_cookies
            account.last_login_at = datetime.utcnow()
            logger.info("[SYNC] Account cookies updated")

        logger.info("[SYNC] Scraping projects...")
        projects = await scrape_projects(page)
        logger.info("[SYNC] Saving %d projects to DB", len(projects))
        for p in projects:
            existing = db.query(Project).filter(
                Project.external_id == p["external_id"],
                Project.account_id == acc_uuid,
            ).first()
            if existing:
                existing.title = p["title"]
                existing.description = p.get("description")
                existing.url = p.get("url")
                existing.category = p.get("category")
                existing.subcategory = p.get("subcategory")
                existing.experience_level = p.get("experience_level")
                existing.proposals_count = p.get("proposals_count")
                existing.interested_count = p.get("interested_count")
                existing.client_name = p.get("client_name")
                existing.budget_min = p.get("budget_min")
                existing.budget_max = p.get("budget_max")
                existing.scraped_at = datetime.utcnow()
                existing.cached_at = datetime.utcnow()
            else:
                db.add(Project(
                    account_id=acc_uuid,
                    external_id=p["external_id"],
                    title=p["title"],
                    description=p.get("description"),
                    url=p.get("url"),
                    category=p.get("category"),
                    subcategory=p.get("subcategory"),
                    experience_level=p.get("experience_level"),
                    proposals_count=p.get("proposals_count"),
                    interested_count=p.get("interested_count"),
                    client_name=p.get("client_name"),
                    budget_min=p.get("budget_min"),
                    budget_max=p.get("budget_max"),
                    scraped_at=datetime.utcnow(),
                    cached_at=datetime.utcnow(),
                ))
        items_scraped += len(projects)

        logger.info("[SYNC] Scraping conversations...")
        conversations = await scrape_conversations(page)
        logger.info("[SYNC] Saving %d conversations to DB", len(conversations))
        for c in conversations:
            upsert_conversation(db, acc_uuid, c)
        items_scraped += len(conversations)

        logger.info("[SYNC] Scraping my proposals...")
        proposals = await scrape_my_proposals(page)
        logger.info("[SYNC] Saving %d proposals to DB", len(proposals))
        for pr in proposals:
            existing = db.query(Proposal).filter(
                Proposal.external_id == pr["external_id"],
                Proposal.account_id == acc_uuid,
            ).first()
            if existing:
                existing.status = pr.get("status", "sent")
                existing.sent_at = pr.get("sent_at")
            else:
                db.add(Proposal(
                    account_id=acc_uuid,
                    external_id=pr["external_id"],
                    status=pr.get("status", "sent"),
                    sent_at=pr.get("sent_at"),
                ))
        items_scraped += len(proposals)

        db.commit()
        job.status = "success"
        job.items_scraped = items_scraped
        logger.info("[SYNC] SUCCESS — %d items scraped", items_scraped)
    except Exception as e:
        db.rollback()
        job.status = "failed"
        job.error_message = str(e)[:1000]
        logger.error("[SYNC] FAILED: %s", e)
        await close_context(account_id)
    finally:
        job.finished_at = datetime.utcnow()
        db.commit()
        db.close()
        if page:
            await page.close()
        logger.info("[SYNC] Job finished")
