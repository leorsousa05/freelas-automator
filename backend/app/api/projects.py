from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project
from app.schemas import ProjectOut

router = APIRouter()


@router.get("", response_model=list[ProjectOut])
def list_projects(account_id: UUID | None = None, is_new: bool | None = None, db: Session = Depends(get_db)):
    q = db.query(Project)
    if account_id:
        q = q.filter(Project.account_id == account_id)
    if is_new is not None:
        q = q.filter(Project.is_new == is_new)
    return q.order_by(Project.scraped_at.desc()).all()


@router.get("/{id}", response_model=ProjectOut)
def get_project(id: UUID, db: Session = Depends(get_db)):
    return db.query(Project).filter(Project.id == id).first()
