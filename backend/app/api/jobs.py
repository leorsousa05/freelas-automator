from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ScrapingJob
from app.schemas import ScrapingJobOut

router = APIRouter()


@router.get("", response_model=list[ScrapingJobOut])
def list_jobs(account_id: UUID | None = None, limit: int = 50, db: Session = Depends(get_db)):
    q = db.query(ScrapingJob)
    if account_id:
        q = q.filter(ScrapingJob.account_id == account_id)
    return q.order_by(ScrapingJob.started_at.desc()).limit(limit).all()


@router.get("/{id}", response_model=ScrapingJobOut)
def get_job(id: UUID, db: Session = Depends(get_db)):
    return db.query(ScrapingJob).filter(ScrapingJob.id == id).first()
