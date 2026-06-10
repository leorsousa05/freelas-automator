import asyncio
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Account, Conversation, ConversationMessage
from app.schemas import ConversationOut, ConversationMessageOut, SendMessageRequest, SendMessageResponse
from app.worker.scraper.messages import scrape_conversations, scrape_conversation_messages, send_message
from app.worker.scraper.helpers import with_authenticated_page
from app.crud import upsert_conversation, upsert_conversation_message

router = APIRouter()


@router.get("", response_model=list[ConversationOut])
def list_conversations(
    account_id: UUID | None = None,
    unread_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Conversation)
    if account_id:
        query = query.filter(Conversation.account_id == account_id)
    if unread_only:
        query = query.filter(Conversation.unread.is_(True))
    return query.order_by(Conversation.last_message_at.desc()).all()


@router.get("/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: UUID, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.get("/{conversation_id}/messages", response_model=list[ConversationMessageOut])
def list_conversation_messages(
    conversation_id: UUID,
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation_id)
        .order_by(ConversationMessage.sent_at.asc())
        .all()
    )


@router.post("/sync")
async def sync_conversations(
    account_id: UUID,
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    async with with_authenticated_page(account_id, db) as page_obj:
        data = await scrape_conversations(page_obj)
        synced = []
        for item in data:
            conv = upsert_conversation(db, account_id, item)
            synced.append(conv)
        return {
            "account_id": str(account_id),
            "synced_count": len(synced),
            "conversations": [ConversationOut.model_validate(c) for c in synced],
        }


@router.post("/{conversation_id}/sync-messages")
async def sync_conversation_messages(
    conversation_id: UUID,
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    account = db.query(Account).filter(Account.id == conv.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    async with with_authenticated_page(conv.account_id, db) as page_obj:
        data = await scrape_conversation_messages(page_obj, conv.external_id)
        synced = []
        for item in data:
            msg = upsert_conversation_message(db, conv.id, item)
            synced.append(msg)
        return {
            "conversation_id": str(conversation_id),
            "synced_count": len(synced),
            "messages": [ConversationMessageOut.model_validate(m) for m in synced],
        }


@router.post("/{conversation_id}/send", response_model=SendMessageResponse)
async def send_conversation_message(
    conversation_id: UUID,
    req: SendMessageRequest,
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message text is required")

    account = db.query(Account).filter(Account.id == conv.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    async with with_authenticated_page(conv.account_id, db) as page_obj:
        result = await send_message(page_obj, conv.external_id, text)
        return SendMessageResponse(
            success=result["success"],
            conversation_id=conversation_id,
            external_id=conv.external_id,
            text=text,
            sent_at=result["sent_at"],
        )
