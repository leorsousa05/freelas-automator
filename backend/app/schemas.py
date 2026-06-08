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
    skills: List[str]
    scraped_at: datetime
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


class ProposalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    account_id: UUID
    project_id: Optional[UUID]
    external_id: str
    value: Optional[Decimal]
    delivery_time_days: Optional[int]
    message: Optional[str]
    status: str
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


class DashboardStats(BaseModel):
    new_projects: int
    unread_messages: int
    pending_proposals: int
    failed_jobs: int
    total_accounts: int
    active_accounts: int
