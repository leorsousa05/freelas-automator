import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Numeric, Integer, Text, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Account(Base):
    __tablename__ = "accounts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    password_encrypted = Column(String, nullable=False)
    session_cookies = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


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
    skills = Column(JSON, default=list)
    scraped_at = Column(DateTime, default=datetime.utcnow)
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


class Proposal(Base):
    __tablename__ = "proposals"
    __table_args__ = (UniqueConstraint("external_id", "account_id", name="uq_proposal_external"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    external_id = Column(String, nullable=False)
    value = Column(Numeric(12, 2), nullable=True)
    delivery_time_days = Column(Integer, nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String, default="sent")
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
