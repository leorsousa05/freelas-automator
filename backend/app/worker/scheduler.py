from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.config import settings
from app.database import SessionLocal
from app.models import Account
from app.worker.scraper import run_full_sync

_scheduler: AsyncIOScheduler | None = None


def start_scheduler():
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _run_scheduled_syncs,
        IntervalTrigger(minutes=settings.scheduler_interval_minutes),
        id="scheduled_sync",
        replace_existing=True,
    )
    _scheduler.start()


def stop_scheduler():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown()
        _scheduler = None


async def _run_scheduled_syncs():
    db = SessionLocal()
    accounts = db.query(Account).filter(Account.is_active == True).all()
    db.close()
    for account in accounts:
        try:
            await run_full_sync(
                str(account.id),
                account.username,
                account.password_encrypted,
                account.session_cookies,
            )
        except Exception as e:
            print(f"Scheduled sync failed for {account.username}: {e}")
