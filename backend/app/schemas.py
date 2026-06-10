from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class AccountCreate(BaseModel):
    username: str
    password: str


class AccountUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    username: str
    is_active: bool
    last_login_at: Optional[datetime]
    created_at: datetime


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    account_id: UUID
    external_id: str
    title: str
    description: Optional[str]
    budget_min: Optional[Decimal]
    budget_max: Optional[Decimal]
    deadline: Optional[datetime]
    url: Optional[str]
    category: Optional[str]
    subcategory: Optional[str]
    skills: List[str]
    experience_level: Optional[str]
    proposals_count: Optional[int]
    interested_count: Optional[int]
    client_name: Optional[str]
    client_avatar: Optional[str]
    client_rating: Optional[Decimal]
    client_last_seen: Optional[str]
    visibility: Optional[str]
    published_at: Optional[str]
    is_featured: bool
    allows_multiple_freelancers: bool
    scraped_at: datetime
    cached_at: Optional[datetime]
    is_new: bool


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    account_id: UUID
    sender_name: Optional[str]
    sender_type: str
    content: Optional[str]
    received_at: Optional[datetime]
    is_read: bool


class ConversationMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    conversation_id: UUID
    external_id: str
    sender_name: Optional[str]
    sender_photo_url: Optional[str]
    sender_type: str
    content: Optional[str]
    has_files: bool
    sent_at: Optional[datetime]
    sent_by_me: bool
    is_read: bool


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    account_id: UUID
    external_id: str
    client_name: Optional[str]
    client_photo_url: Optional[str]
    client_verified: bool
    project_id: Optional[str]
    project_name: Optional[str]
    last_message_snippet: Optional[str]
    last_message_at: Optional[datetime]
    has_files: bool
    is_deleted: bool
    is_system: bool
    is_admin: bool
    unread: bool
    scraped_at: datetime


class ProposalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    account_id: UUID
    project_id: Optional[UUID]
    external_id: str
    freelancer_name: Optional[str]
    freelancer_nickname: Optional[str]
    freelancer_avatar: Optional[str]
    freelancer_rating: Optional[Decimal]
    is_premium: bool
    is_pro: bool
    is_identity_verified: bool
    value: Optional[Decimal]
    final_value: Optional[Decimal]
    delivery_time_days: Optional[int]
    message: Optional[str]
    status: str
    status_badges: List[str]
    submitted_at: Optional[str]
    sent_at: Optional[datetime]


class ScrapingJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    account_id: UUID
    job_type: str
    status: str
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    error_message: Optional[str]
    items_scraped: int


class SendMessageRequest(BaseModel):
    text: str


class SendMessageResponse(BaseModel):
    success: bool
    conversation_id: UUID
    external_id: str
    text: str
    sent_at: datetime


class DashboardStats(BaseModel):
    new_projects: int
    unread_messages: int
    pending_proposals: int
    failed_jobs: int
    total_accounts: int
    active_accounts: int
