from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from app.models import Project, Conversation, ConversationMessage


def upsert_project_from_detail(
    db: Session,
    account_id: UUID,
    external_id: str,
    detail: dict,
) -> Project:
    """
    Update an existing project or create a new one from a scraped detail dict.
    Sets scraped_at and cached_at to now().
    """
    project = db.query(Project).filter(
        Project.external_id == external_id,
        Project.account_id == account_id,
    ).first()

    now = datetime.utcnow()
    fields = {
        "title": detail.get("title"),
        "description": detail.get("description"),
        "url": detail.get("url"),
        "category": detail.get("category"),
        "subcategory": detail.get("subcategory"),
        "budget_min": detail.get("budget_min"),
        "budget_max": detail.get("budget_max"),
        "experience_level": detail.get("experience_level"),
        "proposals_count": detail.get("proposals_count"),
        "interested_count": detail.get("interested_count"),
        "client_name": detail.get("client_name"),
        "client_avatar": detail.get("client_avatar"),
        "client_rating": detail.get("client_rating"),
        "client_last_seen": detail.get("client_last_seen"),
        "visibility": detail.get("visibility"),
        "published_at": detail.get("published_at"),
        "is_featured": detail.get("is_featured", False),
        "allows_multiple_freelancers": detail.get("allows_multiple_freelancers", False),
        "deadline": detail.get("deadline"),
        "scraped_at": now,
        "cached_at": now,
    }

    if project:
        for key, value in fields.items():
            setattr(project, key, value)
    else:
        project = Project(
            account_id=account_id,
            external_id=external_id,
            **fields,
        )
        db.add(project)

    db.commit()
    db.refresh(project)
    return project


def upsert_conversation(
    db: Session,
    account_id: UUID,
    data: dict,
) -> Conversation:
    external_id = str(data.get("external_id", ""))
    conv = db.query(Conversation).filter(
        Conversation.external_id == external_id,
        Conversation.account_id == account_id,
    ).first()

    fields = {
        "client_name": data.get("client_name"),
        "client_photo_url": data.get("client_photo_url"),
        "client_verified": data.get("client_verified", False),
        "project_id": data.get("project_id"),
        "project_name": data.get("project_name"),
        "last_message_snippet": data.get("last_message_snippet"),
        "last_message_at": data.get("last_message_at"),
        "has_files": data.get("has_files", False),
        "is_deleted": data.get("is_deleted", False),
        "is_system": data.get("is_system", False),
        "is_admin": data.get("is_admin", False),
        "unread": data.get("unread", False),
        "scraped_at": datetime.utcnow(),
    }

    if conv:
        for key, value in fields.items():
            setattr(conv, key, value)
    else:
        conv = Conversation(
            account_id=account_id,
            external_id=external_id,
            **fields,
        )
        db.add(conv)

    db.commit()
    db.refresh(conv)
    return conv


def upsert_conversation_message(
    db: Session,
    conversation_id: UUID,
    data: dict,
) -> ConversationMessage:
    external_id = str(data.get("external_id", ""))
    msg = db.query(ConversationMessage).filter(
        ConversationMessage.external_id == external_id,
        ConversationMessage.conversation_id == conversation_id,
    ).first()

    fields = {
        "sender_name": data.get("sender_name"),
        "sender_photo_url": data.get("sender_photo_url"),
        "sender_type": data.get("sender_type", "client"),
        "content": data.get("content"),
        "has_files": data.get("has_files", False),
        "sent_at": data.get("sent_at"),
        "sent_by_me": data.get("sent_by_me", False),
        "is_read": data.get("is_read", True),
    }

    if msg:
        for key, value in fields.items():
            setattr(msg, key, value)
    else:
        msg = ConversationMessage(
            conversation_id=conversation_id,
            external_id=external_id,
            **fields,
        )
        db.add(msg)

    db.commit()
    db.refresh(msg)
    return msg
