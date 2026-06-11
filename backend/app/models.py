import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Numeric, Integer, Text, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Account(Base):
    __tablename__ = "accounts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    platform = Column(String, default="99freelas", nullable=False)
    username = Column(String, nullable=False)
    password_encrypted = Column(String, nullable=False)
    session_cookies = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint("username", "platform", name="uq_account_username_platform"),)


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("external_id", "account_id", name="uq_project_external"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    external_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    budget_min = Column(Numeric(12, 2), nullable=True)
    budget_max = Column(Numeric(12, 2), nullable=True)
    deadline = Column(DateTime, nullable=True)
    url = Column(String, nullable=True)
    category = Column(String, nullable=True)
    subcategory = Column(String, nullable=True)
    skills = Column(JSON, default=list)
    experience_level = Column(String, nullable=True)
    proposals_count = Column(Integer, nullable=True)
    interested_count = Column(Integer, nullable=True)
    client_name = Column(String, nullable=True)
    client_avatar = Column(String, nullable=True)
    client_rating = Column(Numeric(3, 2), nullable=True)
    client_reviews_count = Column(Integer, nullable=True)
    client_last_seen = Column(String, nullable=True)
    visibility = Column(String, nullable=True)
    published_at = Column(String, nullable=True)
    time_remaining = Column(String, nullable=True)
    is_featured = Column(Boolean, default=False)
    is_exclusive = Column(Boolean, default=False)
    is_urgent = Column(Boolean, default=False)
    allows_multiple_freelancers = Column(Boolean, default=False)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    cached_at = Column(DateTime, nullable=True)
    is_new = Column(Boolean, default=True)


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (UniqueConstraint("external_id", "account_id", name="uq_message_external"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    external_id = Column(String, nullable=False)
    sender_name = Column(String, nullable=True)
    sender_type = Column(String, default="client")
    content = Column(Text, nullable=True)
    received_at = Column(DateTime, nullable=True)
    is_read = Column(Boolean, default=False)


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("external_id", "account_id", name="uq_conversation_external"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    external_id = Column(String, nullable=False)
    client_name = Column(String, nullable=True)
    client_photo_url = Column(String, nullable=True)
    client_verified = Column(Boolean, default=False)
    project_id = Column(String, nullable=True)
    project_name = Column(String, nullable=True)
    last_message_snippet = Column(Text, nullable=True)
    last_message_at = Column(DateTime, nullable=True)
    has_files = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    unread = Column(Boolean, default=False)
    scraped_at = Column(DateTime, default=datetime.utcnow)


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"
    __table_args__ = (UniqueConstraint("conversation_id", "external_id", name="uq_conversation_message_external"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)
    external_id = Column(String, nullable=False)
    sender_name = Column(String, nullable=True)
    sender_photo_url = Column(String, nullable=True)
    sender_type = Column(String, default="client")
    content = Column(Text, nullable=True)
    has_files = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    sent_by_me = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)


class Proposal(Base):
    __tablename__ = "proposals"
    __table_args__ = (UniqueConstraint("external_id", "account_id", name="uq_proposal_external"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    external_id = Column(String, nullable=False)
    freelancer_name = Column(String, nullable=True)
    freelancer_nickname = Column(String, nullable=True)
    freelancer_avatar = Column(String, nullable=True)
    freelancer_rating = Column(Numeric(3, 2), nullable=True)
    is_premium = Column(Boolean, default=False)
    is_pro = Column(Boolean, default=False)
    is_identity_verified = Column(Boolean, default=False)
    value = Column(Numeric(12, 2), nullable=True)
    final_value = Column(Numeric(12, 2), nullable=True)
    delivery_time_days = Column(Integer, nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String, default="sent")
    status_badges = Column(JSON, default=list)
    submitted_at = Column(String, nullable=True)
    sent_at = Column(DateTime, nullable=True)


class ScrapingJob(Base):
    __tablename__ = "scraping_jobs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    job_type = Column(String, default="full_sync")
    status = Column(String, default="pending")
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    items_scraped = Column(Integer, default=0)
