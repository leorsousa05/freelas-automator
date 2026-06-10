import logging
from contextlib import asynccontextmanager
from uuid import UUID
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Account
from .auth import ensure_logged_in

logger = logging.getLogger(__name__)


@asynccontextmanager
async def with_authenticated_page(account_id: UUID, db: Session):
    """
    Async context manager that yields a logged-in Playwright Page for the given account.

    Automatically handles:
    - Loading account from DB (raises 404 if missing)
    - Calling ensure_logged_in() with stored credentials
    - Updating account.session_cookies and last_login_at on success
    - Committing DB changes
    - Closing the page on exit (success or exception)
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        logger.warning("[AUTH-HELPER] Account not found: %s", account_id)
        raise HTTPException(status_code=404, detail="Account not found")

    page_obj, new_cookies = await ensure_logged_in(
        str(account.id),
        account.username,
        account.password_encrypted,
        account.session_cookies,
    )
    logger.info("[AUTH-HELPER] Page authenticated for account=%s", account_id)
    try:
        yield page_obj
        account.session_cookies = new_cookies
        account.last_login_at = datetime.utcnow()
        db.commit()
        logger.info("[AUTH-HELPER] Cookies updated for account=%s", account_id)
    except Exception:
        db.rollback()
        raise
    finally:
        await page_obj.close()
        logger.info("[AUTH-HELPER] Page closed for account=%s", account_id)
