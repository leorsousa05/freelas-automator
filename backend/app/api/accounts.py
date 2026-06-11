import asyncio
from uuid import UUID, uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Account, ScrapingJob
from app.schemas import AccountCreate, AccountUpdate, AccountOut, SubscriptionStatus
from app.encryption import encrypt, decrypt
from app.worker.scraper import run_full_sync, scrape_projects, scrape_subscription_status, test_credentials, CATEGORIES
from app.worker.scraper.helpers import with_authenticated_page

router = APIRouter()


@router.get("", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()


@router.post("", response_model=AccountOut)
def create_account(data: AccountCreate, db: Session = Depends(get_db)):
    existing = db.query(Account).filter(
        Account.username == data.username,
        Account.platform == data.platform,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Conta já existe para essa plataforma")
    account = Account(
        platform=data.platform,
        username=data.username,
        password_encrypted=encrypt(data.password),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/{id}", response_model=AccountOut)
def get_account(id: UUID, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.put("/{id}", response_model=AccountOut)
def update_account(id: UUID, data: AccountUpdate, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if data.platform is not None:
        account.platform = data.platform
    if data.username is not None:
        account.username = data.username
    if data.password is not None:
        account.password_encrypted = encrypt(data.password)
    if data.is_active is not None:
        account.is_active = data.is_active
    db.commit()
    db.refresh(account)
    return account


@router.post("/test-login")
async def test_account_login(data: AccountCreate):
    result = await test_credentials(data.platform, data.username, encrypt(data.password))
    return result


@router.delete("/{id}")
def delete_account(id: UUID, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(account)
    db.commit()
    return {"ok": True}


@router.post("/{id}/sync")
async def sync_account(id: UUID, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    job = ScrapingJob(
        id=uuid4(),
        account_id=account.id,
        job_type="full_sync",
        status="queued",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    asyncio.create_task(run_full_sync(
        str(job.id),
        str(account.id),
        account.username,
        account.password_encrypted,
        account.session_cookies,
    ))
    return {"status": "queued", "account_id": str(id), "job_id": str(job.id)}


@router.get("/{id}/projects")
async def get_account_projects(
    id: UUID,
    category: str | None = None,
    page: int = 1,
    db: Session = Depends(get_db),
):
    if category and category not in CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Available: {list(CATEGORIES.keys())}",
        )
    async with with_authenticated_page(id, db) as page_obj:
        projects = await scrape_projects(page_obj, category_slug=category, page_num=page)
        return {
            "account_id": str(id),
            "category": category,
            "page": page,
            "count": len(projects),
            "projects": projects,
        }


@router.get("/categories/available")
def list_categories():
    return CATEGORIES


@router.get("/{id}/subscription", response_model=SubscriptionStatus)
async def get_account_subscription(id: UUID, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    async with with_authenticated_page(id, db) as page_obj:
        result = await scrape_subscription_status(page_obj)
        return SubscriptionStatus(
            has_subscription=result["has_subscription"],
            plan_name=result.get("plan_name"),
        )
