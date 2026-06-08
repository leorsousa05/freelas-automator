from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Message
from app.schemas import MessageOut

router = APIRouter()


@router.get("", response_model=list[MessageOut])
def list_messages(account_id: UUID | None = None, is_read: bool | None = None, db: Session = Depends(get_db)):
    q = db.query(Message)
    if account_id:
        q = q.filter(Message.account_id == account_id)
    if is_read is not None:
        q = q.filter(Message.is_read == is_read)
    return q.order_by(Message.received_at.desc()).all()


@router.patch("/{id}/read")
def mark_read(id: UUID, db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == id).first()
    if msg:
        msg.is_read = True
        db.commit()
    return {"ok": True}
