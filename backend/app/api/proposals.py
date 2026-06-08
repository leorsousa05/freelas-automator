from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Proposal
from app.schemas import ProposalOut

router = APIRouter()


@router.get("", response_model=list[ProposalOut])
def list_proposals(account_id: UUID | None = None, status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Proposal)
    if account_id:
        q = q.filter(Proposal.account_id == account_id)
    if status:
        q = q.filter(Proposal.status == status)
    return q.order_by(Proposal.sent_at.desc()).all()


@router.get("/{id}", response_model=ProposalOut)
def get_proposal(id: UUID, db: Session = Depends(get_db)):
    return db.query(Proposal).filter(Proposal.id == id).first()
