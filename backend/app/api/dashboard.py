from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, Message, Proposal, ScrapingJob, Account
from app.schemas import DashboardStats

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    new_projects = db.query(func.count(Project.id)).filter(Project.is_new == True).scalar()
    unread_messages = db.query(func.count(Message.id)).filter(Message.is_read == False).scalar()
    pending_proposals = db.query(func.count(Proposal.id)).filter(Proposal.status == "sent").scalar()
    failed_jobs = db.query(func.count(ScrapingJob.id)).filter(ScrapingJob.status == "failed").scalar()
    total_accounts = db.query(func.count(Account.id)).scalar()
    active_accounts = db.query(func.count(Account.id)).filter(Account.is_active == True).scalar()
    return DashboardStats(
        new_projects=new_projects or 0,
        unread_messages=unread_messages or 0,
        pending_proposals=pending_proposals or 0,
        failed_jobs=failed_jobs or 0,
        total_accounts=total_accounts or 0,
        active_accounts=active_accounts or 0,
    )
