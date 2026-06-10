import logging
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Account, Project
from app.schemas import ProjectOut
from app.crud import upsert_project_from_detail
from app.worker.scraper import (
    scrape_projects,
    scrape_project_detail,
    scrape_project_proposals,
    scrape_project_full,
    CATEGORIES,
    BASE_URL,
)
from app.worker.scraper.helpers import with_authenticated_page
from app.worker.pool import close_context

router = APIRouter()
logger = logging.getLogger(__name__)

CACHE_MINUTES = 15


@router.get("", response_model=list[ProjectOut])
def list_projects(
    account_id: UUID | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Project)
    if account_id:
        query = query.filter(Project.account_id == account_id)
    if category:
        category_name = CATEGORIES.get(category, category)
        query = query.filter(Project.category.ilike(f"%{category_name}%"))
    return query.order_by(Project.cached_at.desc().nullslast()).all()


@router.post("/scrape")
async def scrape_and_cache_projects(
    account_id: UUID,
    category: str | None = None,
    page: int = 1,
    db: Session = Depends(get_db),
):
    logger.info("[API] POST /scrape account=%s category=%s page=%s", account_id, category, page)
    async with with_authenticated_page(account_id, db) as page_obj:
        projects = await scrape_projects(page_obj, category_slug=category, page_num=page)
        now = datetime.utcnow()
        for p in projects:
            existing = db.query(Project).filter(
                Project.external_id == p["external_id"],
                Project.account_id == account_id,
            ).first()
            if existing:
                existing.title = p["title"]
                existing.description = p.get("description")
                existing.url = p.get("url")
                existing.category = p.get("category")
                existing.subcategory = p.get("subcategory")
                existing.budget_min = p.get("budget_min")
                existing.budget_max = p.get("budget_max")
                existing.experience_level = p.get("experience_level")
                existing.proposals_count = p.get("proposals_count")
                existing.interested_count = p.get("interested_count")
                existing.client_name = p.get("client_name")
                existing.skills = p.get("skills", [])
                existing.scraped_at = now
                existing.cached_at = now
            else:
                db.add(Project(
                    account_id=account_id,
                    external_id=p["external_id"],
                    title=p["title"],
                    description=p.get("description"),
                    url=p.get("url"),
                    category=p.get("category"),
                    subcategory=p.get("subcategory"),
                    budget_min=p.get("budget_min"),
                    budget_max=p.get("budget_max"),
                    experience_level=p.get("experience_level"),
                    proposals_count=p.get("proposals_count"),
                    interested_count=p.get("interested_count"),
                    client_name=p.get("client_name"),
                    skills=p.get("skills", []),
                    scraped_at=now,
                    cached_at=now,
                ))
        db.commit()
        logger.info("[API] POST /scrape done — %d projects saved", len(projects))
        return {
            "account_id": str(account_id),
            "category": category,
            "page": page,
            "count": len(projects),
            "projects": projects,
        }


@router.get("/{external_id}", response_model=ProjectOut)
def get_project(external_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.external_id == external_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{external_id}/detail")
async def get_project_detail_live(
    external_id: str,
    account_id: UUID,
    db: Session = Depends(get_db),
):
    """Scrape live project detail and update cache."""
    logger.info("[API] GET /%s/detail account=%s", external_id, account_id)
    project = db.query(Project).filter(
        Project.external_id == external_id,
        Project.account_id == account_id,
    ).first()
    project_path = project.url.replace(BASE_URL, "") if project and project.url else f"/project/{external_id}"

    async with with_authenticated_page(account_id, db) as page_obj:
        detail = await scrape_project_detail(page_obj, project_path)
        if detail:
            upsert_project_from_detail(db, account_id, external_id, detail)
            logger.info("[API] GET /%s/detail done — title=%s", external_id, detail.get("title"))
            return detail
        raise HTTPException(status_code=404, detail="Could not scrape project detail")


@router.get("/{external_id}/full")
async def get_project_full(
    external_id: str,
    account_id: UUID,
    db: Session = Depends(get_db),
):
    """Scrape detail + proposals in a single navigation."""
    logger.info("[API] GET /%s/full account=%s", external_id, account_id)
    project = db.query(Project).filter(
        Project.external_id == external_id,
        Project.account_id == account_id,
    ).first()
    project_path = project.url.replace(BASE_URL, "") if project and project.url else f"/project/{external_id}"

    async with with_authenticated_page(account_id, db) as page_obj:
        result = await scrape_project_full(page_obj, project_path)
        detail = result["detail"]
        proposals = result["proposals"]
        if detail:
            upsert_project_from_detail(db, account_id, external_id, detail)
            logger.info("[API] GET /%s/full done — detail+%d proposals in one nav", external_id, len(proposals))
            return {"detail": detail, "proposals": proposals}
        raise HTTPException(status_code=404, detail="Could not scrape project")


@router.get("/{external_id}/proposals")
async def get_project_proposals(
    external_id: str,
    account_id: UUID,
    db: Session = Depends(get_db),
):
    logger.info("[API] GET /%s/proposals account=%s", external_id, account_id)
    project = db.query(Project).filter(
        Project.external_id == external_id,
        Project.account_id == account_id,
    ).first()
    project_url = project.url if project else None

    async with with_authenticated_page(account_id, db) as page_obj:
        proposals = await scrape_project_proposals(page_obj, external_id, project_url)
        logger.info("[API] GET /%s/proposals done — %d proposals", external_id, len(proposals))
        return {"external_id": external_id, "count": len(proposals), "proposals": proposals}


@router.get("/{external_id}/is-stale")
def is_project_stale(external_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.external_id == external_id).first()
    if not project or not project.cached_at:
        return {"stale": True, "minutes_ago": None}
    minutes_ago = (datetime.utcnow() - project.cached_at).total_seconds() / 60
    return {"stale": minutes_ago > CACHE_MINUTES, "minutes_ago": round(minutes_ago, 1)}
