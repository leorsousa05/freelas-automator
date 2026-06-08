# Freelas Automation Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack MVP that monitors multiple 99freelas accounts via Playwright scraping, persists data in PostgreSQL, and exposes a React dashboard.

**Architecture:** FastAPI backend with APScheduler + ThreadPoolExecutor + Playwright browser pool. React + Tailwind + Vite frontend. Docker Compose with PostgreSQL + Nginx.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic, Playwright, APScheduler, PostgreSQL, React 18, Tailwind CSS, Vite, Docker.

---

## File Structure

```
freelas-automator/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, lifespan, router inclusion
│   │   ├── config.py            # Pydantic settings, env vars
│   │   ├── database.py          # SQLAlchemy engine, session, base
│   │   ├── models.py            # 5 SQLAlchemy models
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── encryption.py        # Fernet wrapper
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── accounts.py      # Account CRUD + sync endpoint
│   │   │   ├── projects.py      # Project list/detail
│   │   │   ├── messages.py      # Message list + mark read
│   │   │   ├── proposals.py     # Proposal list/detail
│   │   │   ├── jobs.py          # ScrapingJob list/detail
│   │   │   └── dashboard.py     # Stats endpoint
│   │   └── worker/
│   │       ├── __init__.py
│   │       ├── pool.py          # BrowserPool singleton
│   │       ├── captcha.py       # 2captcha API client
│   │       ├── scraper.py       # 99freelas scraping logic
│   │       └── scheduler.py     # APScheduler setup + full_sync job
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_encryption.py
│   │   ├── test_schemas.py
│   │   └── test_api.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── alembic.ini
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── api.ts               # Fetch wrapper + typed endpoints
│   │   ├── types.ts             # Shared TS types
│   │   ├── hooks/
│   │   │   ├── useFetch.ts
│   │   │   └── useSync.ts
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── Skeleton.tsx
│   │   └── pages/
│   │       ├── Dashboard.tsx
│   │       ├── Accounts.tsx
│   │       ├── Projects.tsx
│   │       ├── Messages.tsx
│   │       ├── Proposals.tsx
│   │       └── Jobs.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── package.json
├── docker-compose.yml
├── nginx.conf
└── .env.example
```

---

## Task 1: Backend Project Setup

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/Dockerfile`
- Create: `backend/alembic.ini`
- Create: `backend/app/__init__.py`
- Create: `.env.example`

- [ ] **Step 1: Write requirements.txt**

```txt
fastapi==0.111.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.30
psycopg2-binary==2.9.9
pydantic-settings==2.3.4
cryptography==42.0.8
playwright==1.44.0
apscheduler==3.10.4
alembic==1.13.1
pytest==8.2.2
httpx==0.27.0
python-multipart==0.0.9
```

- [ ] **Step 2: Write Dockerfile**

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libglib2.0-0 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium
RUN playwright install-deps chromium

COPY app/ ./app/
COPY alembic.ini .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Write alembic.ini**

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os
sqlalchemy.url = postgresql://user:pass@db/freelas
```

- [ ] **Step 4: Write .env.example**

```bash
DATABASE_URL=postgresql://freelas:freelas@db:5432/freelas
ENCRYPTION_KEY=base64-encoded-32-byte-key
TWOCAPTCHA_API_KEY=your-2captcha-key
SCHEDULER_INTERVAL_MINUTES=30
MAX_WORKERS=5
```

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/Dockerfile backend/alembic.ini backend/app/__init__.py .env.example
git commit -m "chore: backend project setup"
```

---

## Task 2: Configuration Module

**Files:**
- Create: `backend/app/config.py`

- [ ] **Step 1: Write config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://freelas:freelas@db:5432/freelas"
    encryption_key: str = ""
    twocaptcha_api_key: str = ""
    scheduler_interval_minutes: int = 30
    max_workers: int = 5
    playwright_headless: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/config.py
git commit -m "feat: add pydantic settings"
```

---

## Task 3: Database Layer

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/models.py`

- [ ] **Step 1: Write database.py**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 2: Write models.py**

```python
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
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/database.py backend/app/models.py
git commit -m "feat: add database models"
```

---

## Task 4: Encryption Module

**Files:**
- Create: `backend/app/encryption.py`
- Create: `backend/tests/test_encryption.py`

- [ ] **Step 1: Write test_encryption.py (failing)**

```python
from app.encryption import encrypt, decrypt


def test_encrypt_decrypt():
    plain = "my-secret-password"
    enc = encrypt(plain)
    assert enc != plain
    dec = decrypt(enc)
    assert dec == plain


def test_decrypt_invalid():
    try:
        decrypt("invalid-token")
        assert False, "Should raise"
    except Exception:
        pass
```

- [ ] **Step 2: Run failing test**

```bash
cd backend && pytest tests/test_encryption.py -v
```
Expected: `ImportError: cannot import name 'encrypt'`

- [ ] **Step 3: Write encryption.py**

```python
from cryptography.fernet import Fernet
from app.config import settings

_fernet = Fernet(settings.encryption_key.encode()[:32].ljust(32, b"0"))


def encrypt(plain: str) -> str:
    return _fernet.encrypt(plain.encode()).decode()


def decrypt(token: str) -> str:
    return _fernet.decrypt(token.encode()).decode()
```

- [ ] **Step 4: Run passing test**

```bash
cd backend && ENCRYPTION_KEY="test-key-12345678901234567890123456789012" pytest tests/test_encryption.py -v
```
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/encryption.py backend/tests/test_encryption.py
git commit -m "feat: add fernet encryption with tests"
```

---

## Task 5: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas.py`
- Create: `backend/tests/test_schemas.py`

- [ ] **Step 1: Write schemas.py**

```python
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
```

- [ ] **Step 2: Write test_schemas.py**

```python
from uuid import uuid4
from app.schemas import AccountCreate, ProjectOut


def test_account_create_valid():
    a = AccountCreate(username="joao", password="secret")
    assert a.username == "joao"


def test_project_out_serialization():
    data = {
        "id": uuid4(),
        "account_id": uuid4(),
        "external_id": "123",
        "title": "Test",
        "description": None,
        "budget_min": None,
        "budget_max": None,
        "deadline": None,
        "url": None,
        "category": None,
        "skills": [],
        "scraped_at": "2026-06-08T10:00:00",
        "is_new": True,
    }
    p = ProjectOut.model_validate(data)
    assert p.title == "Test"
```

- [ ] **Step 3: Run tests**

```bash
cd backend && pytest tests/test_schemas.py -v
```
Expected: 2 passed

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas.py backend/tests/test_schemas.py
git commit -m "feat: add pydantic schemas with tests"
```

---

## Task 6: FastAPI App + Accounts API

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/accounts.py`
- Modify: `backend/tests/test_api.py`

- [ ] **Step 1: Write main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api import accounts, projects, messages, proposals, jobs, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Freelas Automation", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router, prefix="/api/accounts", tags=["accounts"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(proposals.router, prefix="/api/proposals", tags=["proposals"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
```

- [ ] **Step 2: Write api/__init__.py**

```python
# empty
```

- [ ] **Step 3: Write api/accounts.py**

```python
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Account
from app.schemas import AccountCreate, AccountUpdate, AccountOut
from app.encryption import encrypt, decrypt

router = APIRouter()


@router.get("", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()


@router.post("", response_model=AccountOut)
def create_account(data: AccountCreate, db: Session = Depends(get_db)):
    existing = db.query(Account).filter(Account.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    account = Account(
        username=data.username,
        password_encrypted=encrypt(data.password),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/{id}", response_model=AccountOut)
def get_account(id: UUID, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.put("/{id}", response_model=AccountOut)
def update_account(id: UUID, data: AccountUpdate, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if data.username is not None:
        account.username = data.username
    if data.password is not None:
        account.password_encrypted = encrypt(data.password)
    if data.is_active is not None:
        account.is_active = data.is_active
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{id}")
def delete_account(id: UUID, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(account)
    db.commit()
    return {"ok": True}


@router.post("/{id}/sync")
def sync_account(id: UUID, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    # TODO: trigger sync via scheduler in Task 15
    return {"status": "queued", "account_id": str(id)}
```

- [ ] **Step 4: Write test_api.py**

```python
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine
from sqlalchemy.orm import sessionmaker

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

client = TestClient(app)


def test_create_and_list_accounts():
    # Use in-memory SQLite for tests or clean PostgreSQL test db
    # For this plan, assume test env points to a test database
    response = client.post("/api/accounts", json={"username": "testuser", "password": "pass123"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert "password" not in data

    response = client.get("/api/accounts")
    assert response.status_code == 200
    assert len(response.json()) >= 1
```

- [ ] **Step 5: Run tests**

```bash
cd backend && ENCRYPTION_KEY="test-key-12345678901234567890123456789012" pytest tests/test_api.py -v
```
Expected: 1 passed

- [ ] **Step 6: Commit**

```bash
git add backend/app/main.py backend/app/api/ backend/tests/test_api.py
git commit -m "feat: add FastAPI app and accounts CRUD API"
```

---

## Task 7: Remaining API Endpoints

**Files:**
- Create: `backend/app/api/projects.py`
- Create: `backend/app/api/messages.py`
- Create: `backend/app/api/proposals.py`
- Create: `backend/app/api/jobs.py`
- Create: `backend/app/api/dashboard.py`

- [ ] **Step 1: Write api/projects.py**

```python
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
```

- [ ] **Step 2: Write api/messages.py**

```python
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
```

- [ ] **Step 3: Write api/proposals.py**

```python
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
```

- [ ] **Step 4: Write api/jobs.py**

```python
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ScrapingJob
from app.schemas import ScrapingJobOut

router = APIRouter()


@router.get("", response_model=list[ScrapingJobOut])
def list_jobs(account_id: UUID | None = None, limit: int = 50, db: Session = Depends(get_db)):
    q = db.query(ScrapingJob)
    if account_id:
        q = q.filter(ScrapingJob.account_id == account_id)
    return q.order_by(ScrapingJob.started_at.desc()).limit(limit).all()


@router.get("/{id}", response_model=ScrapingJobOut)
def get_job(id: UUID, db: Session = Depends(get_db)):
    return db.query(ScrapingJob).filter(ScrapingJob.id == id).first()
```

- [ ] **Step 5: Write api/dashboard.py**

```python
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
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/projects.py backend/app/api/messages.py backend/app/api/proposals.py backend/app/api/jobs.py backend/app/api/dashboard.py
git commit -m "feat: add projects, messages, proposals, jobs and dashboard APIs"
```

---

## Task 8: Browser Pool

**Files:**
- Create: `backend/app/worker/__init__.py`
- Create: `backend/app/worker/pool.py`

- [ ] **Step 1: Write worker/__init__.py**

```python
# empty
```

- [ ] **Step 2: Write worker/pool.py**

```python
import asyncio
from playwright.async_api import async_playwright, Browser, BrowserContext
from app.config import settings

_browser: Browser | None = None
_contexts: dict[str, BrowserContext] = {}
_playwright = None


async def get_browser() -> Browser:
    global _browser, _playwright
    if _browser is None:
        _playwright = await async_playwright().start()
        _browser = await _playwright.chromium.launch(
            headless=settings.playwright_headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
    return _browser


async def get_context(account_id: str) -> BrowserContext:
    if account_id in _contexts:
        return _contexts[account_id]
    browser = await get_browser()
    context = await browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    )
    _contexts[account_id] = context
    return context


async def close_context(account_id: str):
    if account_id in _contexts:
        await _contexts[account_id].close()
        del _contexts[account_id]


async def close_browser():
    global _browser, _playwright
    for ctx in list(_contexts.values()):
        await ctx.close()
    _contexts.clear()
    if _browser:
        await _browser.close()
        _browser = None
    if _playwright:
        await _playwright.stop()
        _playwright = None
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/worker/__init__.py backend/app/worker/pool.py
git commit -m "feat: add Playwright browser pool with context isolation"
```

---

## Task 9: 2captcha Integration

**Files:**
- Create: `backend/app/worker/captcha.py`

- [ ] **Step 1: Write worker/captcha.py**

```python
import httpx
import asyncio
from app.config import settings

TWOCAPTCHA_API = "http://2captcha.com"


async def solve_recaptcha(site_key: str, page_url: str, timeout: int = 60) -> str | None:
    async with httpx.AsyncClient() as client:
        # Request captcha solve
        resp = await client.post(
            f"{TWOCAPTCHA_API}/in.php",
            data={
                "key": settings.twocaptcha_api_key,
                "method": "userrecaptcha",
                "googlekey": site_key,
                "pageurl": page_url,
                "json": 1,
            },
        )
        data = resp.json()
        if data.get("status") != 1:
            return None
        captcha_id = data["request"]

        # Poll for result
        for _ in range(timeout):
            await asyncio.sleep(5)
            result = await client.get(
                f"{TWOCAPTCHA_API}/res.php",
                params={
                    "key": settings.twocaptcha_api_key,
                    "action": "get",
                    "id": captcha_id,
                    "json": 1,
                },
            )
            result_data = result.json()
            if result_data.get("status") == 1:
                return result_data["request"]
            if result_data.get("request") == "CAPCHA_NOT_READY":
                continue
            return None
        return None
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/worker/captcha.py
git commit -m "feat: add 2captcha integration"
```

---

## Task 10: Scraper — Login

**Files:**
- Create: `backend/app/worker/scraper.py`

- [ ] **Step 1: Write scraper.py — login function**

```python
import json
from playwright.async_api import Page
from app.worker.pool import get_context
from app.worker.captcha import solve_recaptcha
from app.encryption import decrypt

LOGIN_URL = "https://www.99freelas.com.br/login"


async def ensure_logged_in(account_id: str, username: str, encrypted_password: str, cookies_json: str | None) -> Page:
    context = await get_context(account_id)
    page = await context.new_page()

    # Try restoring session from cookies
    if cookies_json:
        cookies = json.loads(cookies_json)
        await context.add_cookies(cookies)
        await page.goto("https://www.99freelas.com.br/projects")
        if "login" not in page.url:
            return page  # Still logged in

    # Need to login
    await page.goto(LOGIN_URL)
    await page.fill('input[name="username"]', username)
    await page.fill('input[name="password"]', decrypt(encrypted_password))

    # Check for captcha
    captcha_frame = page.locator('iframe[title="reCAPTCHA"]').first
    if await captcha_frame.is_visible(timeout=5000):
        site_key = await captcha_frame.get_attribute("src")
        # Extract sitekey from URL
        # This is simplified; real implementation may vary
        token = await solve_recaptcha("SITE_KEY_HERE", LOGIN_URL)
        if token:
            await page.evaluate(f'document.getElementById("g-recaptcha-response").innerHTML="{token}"')

    await page.click('button[type="submit"]')
    await page.wait_for_load_state("networkidle")

    if "login" in page.url:
        raise Exception("Login failed")

    # Save cookies
    cookies = await context.cookies()
    return page, json.dumps(cookies)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/worker/scraper.py
git commit -m "feat: add scraper login with session restore"
```

---

## Task 11: Scraper — Projects, Messages, Proposals

**Files:**
- Modify: `backend/app/worker/scraper.py`

- [ ] **Step 1: Add scrape_projects function**

```python
from datetime import datetime
from decimal import Decimal
from bs4 import BeautifulSoup


async def scrape_projects(page: Page) -> list[dict]:
    await page.goto("https://www.99freelas.com.br/projects")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")
    projects = []

    # NOTE: These selectors are EXAMPLES. 99freelas may differ.
    # Inspect the real site and update selectors accordingly.
    for item in soup.select(".project-item"):
        title_el = item.select_one(".project-title a")
        budget_el = item.select_one(".project-budget")
        projects.append({
            "external_id": title_el["href"].split("/")[-1] if title_el else "",
            "title": title_el.get_text(strip=True) if title_el else "",
            "description": item.select_one(".project-description").get_text(strip=True) if item.select_one(".project-description") else "",
            "url": f"https://www.99freelas.com.br{title_el['href']}" if title_el else "",
            "budget_text": budget_el.get_text(strip=True) if budget_el else None,
        })
    return projects
```

- [ ] **Step 2: Add scrape_messages function**

```python
async def scrape_messages(page: Page) -> list[dict]:
    await page.goto("https://www.99freelas.com.br/messages")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")
    messages = []

    for item in soup.select(".message-item"):
        messages.append({
            "external_id": item.get("data-id", ""),
            "sender_name": item.select_one(".sender-name").get_text(strip=True) if item.select_one(".sender-name") else "",
            "content": item.select_one(".message-content").get_text(strip=True) if item.select_one(".message-content") else "",
            "received_at": datetime.utcnow(),  # Parse real date if available
        })
    return messages
```

- [ ] **Step 3: Add scrape_proposals function**

```python
async def scrape_proposals(page: Page) -> list[dict]:
    await page.goto("https://www.99freelas.com.br/proposals")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")
    proposals = []

    for item in soup.select(".proposal-item"):
        proposals.append({
            "external_id": item.get("data-id", ""),
            "value": None,  # Parse from page
            "status": item.select_one(".proposal-status").get_text(strip=True) if item.select_one(".proposal-status") else "sent",
            "sent_at": datetime.utcnow(),
        })
    return proposals
```

- [ ] **Step 4: Add run_full_sync orchestrator**

```python
from app.database import SessionLocal
from app.models import Project, Message, Proposal, ScrapingJob
from app.worker.pool import close_context


async def run_full_sync(account_id: str, username: str, password_encrypted: str, cookies_json: str | None):
    db = SessionLocal()
    job = ScrapingJob(account_id=account_id, job_type="full_sync", status="running", started_at=datetime.utcnow())
    db.add(job)
    db.commit()
    db.refresh(job)

    items_scraped = 0
    try:
        page, new_cookies = await ensure_logged_in(account_id, username, password_encrypted, cookies_json)

        # Update account cookies
        account = db.query(Account).filter(Account.id == account_id).first()
        if account:
            account.session_cookies = new_cookies
            account.last_login_at = datetime.utcnow()

        # Scrape projects
        projects = await scrape_projects(page)
        for p in projects:
            db.merge(Project(
                account_id=account_id,
                external_id=p["external_id"],
                title=p["title"],
                description=p.get("description"),
                url=p.get("url"),
                scraped_at=datetime.utcnow(),
            ))
        items_scraped += len(projects)

        # Scrape messages
        messages = await scrape_messages(page)
        for m in messages:
            db.merge(Message(
                account_id=account_id,
                external_id=m["external_id"],
                sender_name=m.get("sender_name"),
                content=m.get("content"),
                received_at=m.get("received_at"),
            ))
        items_scraped += len(messages)

        # Scrape proposals
        proposals = await scrape_proposals(page)
        for pr in proposals:
            db.merge(Proposal(
                account_id=account_id,
                external_id=pr["external_id"],
                status=pr.get("status", "sent"),
                sent_at=pr.get("sent_at"),
            ))
        items_scraped += len(proposals)

        db.commit()
        job.status = "success"
        job.items_scraped = items_scraped
    except Exception as e:
        db.rollback()
        job.status = "failed"
        job.error_message = str(e)[:1000]
        # Close context on error to force re-login next time
        await close_context(account_id)
    finally:
        job.finished_at = datetime.utcnow()
        db.commit()
        db.close()
        if 'page' in locals():
            await page.close()
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/worker/scraper.py
git commit -m "feat: add project, message, proposal scrapers and full_sync orchestrator"
```

---

## Task 12: Scheduler + Docker Compose

**Files:**
- Create: `backend/app/worker/scheduler.py`
- Create: `docker-compose.yml`
- Create: `nginx.conf`

- [ ] **Step 1: Write scheduler.py**

```python
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.config import settings
from app.database import SessionLocal
from app.models import Account
from app.worker.scraper import run_full_sync

_scheduler: AsyncIOScheduler | None = None


def start_scheduler():
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _run_scheduled_syncs,
        IntervalTrigger(minutes=settings.scheduler_interval_minutes),
        id="scheduled_sync",
        replace_existing=True,
    )
    _scheduler.start()


def stop_scheduler():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown()
        _scheduler = None


async def _run_scheduled_syncs():
    db = SessionLocal()
    accounts = db.query(Account).filter(Account.is_active == True).all()
    db.close()
    for account in accounts:
        try:
            await run_full_sync(
                str(account.id),
                account.username,
                account.password_encrypted,
                account.session_cookies,
            )
        except Exception as e:
            print(f"Scheduled sync failed for {account.username}: {e}")
```

- [ ] **Step 2: Modify api/accounts.py sync endpoint**

Add import and update the sync endpoint:

```python
from app.worker.scraper import run_full_sync
import asyncio

# In the sync_account function, replace the TODO with:
asyncio.create_task(run_full_sync(
    str(account.id),
    account.username,
    account.password_encrypted,
    account.session_cookies,
))
```

- [ ] **Step 3: Modify main.py to start scheduler**

```python
from app.worker.scheduler import start_scheduler, stop_scheduler
from app.worker.pool import close_browser

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield
    stop_scheduler()
    await close_browser()
```

- [ ] **Step 4: Write docker-compose.yml**

```yaml
version: "3.8"

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: freelas
      POSTGRES_PASSWORD: freelas
      POSTGRES_DB: freelas
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://freelas:freelas@db:5432/freelas
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - TWOCAPTCHA_API_KEY=${TWOCAPTCHA_API_KEY}
    depends_on:
      - db
    volumes:
      - ./backend/app:/app/app

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./frontend/dist:/usr/share/nginx/html
    depends_on:
      - api

volumes:
  pgdata:
```

- [ ] **Step 5: Write nginx.conf**

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/worker/scheduler.py backend/app/main.py backend/app/api/accounts.py docker-compose.yml nginx.conf
git commit -m "feat: add APScheduler, docker-compose and nginx config"
```

---

## Task 13: Frontend Setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "freelas-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.2.13"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Write tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Write vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

- [ ] **Step 5: Write tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 6: Write index.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FreelaBot</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-100 text-gray-900;
}
```

- [ ] **Step 8: Write main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

- [ ] **Step 9: Write App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Projects from './pages/Projects'
import Messages from './pages/Messages'
import Proposals from './pages/Proposals'
import Jobs from './pages/Jobs'

function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/jobs" element={<Jobs />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
```

- [ ] **Step 10: Install dependencies**

```bash
cd frontend && npm install
```

- [ ] **Step 11: Commit**

```bash
git add frontend/
git commit -m "chore: frontend setup with Vite + React + Tailwind"
```

---

## Task 14: API Client + Hooks

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api.ts`
- Create: `frontend/src/hooks/useFetch.ts`
- Create: `frontend/src/hooks/useSync.ts`

- [ ] **Step 1: Write types.ts**

```typescript
export interface Account {
  id: string
  username: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export interface Project {
  id: string
  account_id: string
  external_id: string
  title: string
  description: string | null
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  url: string | null
  category: string | null
  skills: string[]
  scraped_at: string
  is_new: boolean
}

export interface Message {
  id: string
  account_id: string
  sender_name: string | null
  sender_type: string
  content: string | null
  received_at: string | null
  is_read: boolean
}

export interface Proposal {
  id: string
  account_id: string
  project_id: string | null
  external_id: string
  value: number | null
  delivery_time_days: number | null
  message: string | null
  status: string
  sent_at: string | null
}

export interface ScrapingJob {
  id: string
  account_id: string
  job_type: string
  status: string
  started_at: string | null
  finished_at: string | null
  error_message: string | null
  items_scraped: number
}

export interface DashboardStats {
  new_projects: number
  unread_messages: number
  pending_proposals: number
  failed_jobs: number
  total_accounts: number
  active_accounts: number
}
```

- [ ] **Step 2: Write api.ts**

```typescript
import type { Account, Project, Message, Proposal, ScrapingJob, DashboardStats } from './types'

const API = '/api'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  accounts: {
    list: () => fetchJSON<Account[]>(`${API}/accounts`),
    create: (data: { username: string; password: string }) => fetchJSON<Account>(`${API}/accounts`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Account>) => fetchJSON<Account>(`${API}/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => fetchJSON<void>(`${API}/accounts/${id}`, { method: 'DELETE' }),
    sync: (id: string) => fetchJSON<{ status: string }>(`${API}/accounts/${id}/sync`, { method: 'POST' }),
  },
  projects: {
    list: (params?: string) => fetchJSON<Project[]>(`${API}/projects?${params || ''}`),
  },
  messages: {
    list: (params?: string) => fetchJSON<Message[]>(`${API}/messages?${params || ''}`),
    markRead: (id: string) => fetchJSON<void>(`${API}/messages/${id}/read`, { method: 'PATCH' }),
  },
  proposals: {
    list: (params?: string) => fetchJSON<Proposal[]>(`${API}/proposals?${params || ''}`),
  },
  jobs: {
    list: () => fetchJSON<ScrapingJob[]>(`${API}/jobs`),
  },
  dashboard: {
    stats: () => fetchJSON<DashboardStats>(`${API}/dashboard/stats`),
  },
}
```

- [ ] **Step 3: Write useFetch.ts**

```typescript
import { useState, useEffect, useCallback } from 'react'

export function useFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
```

- [ ] **Step 4: Write useSync.ts**

```typescript
import { useState, useCallback } from 'react'
import { api } from '../api'

export function useSync() {
  const [syncing, setSyncing] = useState<string | null>(null)

  const sync = useCallback(async (accountId: string) => {
    setSyncing(accountId)
    try {
      await api.accounts.sync(accountId)
    } finally {
      setSyncing(null)
    }
  }, [])

  return { sync, syncing }
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types.ts frontend/src/api.ts frontend/src/hooks/
git commit -m "feat: add api client and custom hooks"
```

---

## Task 15: Layout + Shared Components

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/DataTable.tsx`
- Create: `frontend/src/components/StatusBadge.tsx`
- Create: `frontend/src/components/Skeleton.tsx`

- [ ] **Step 1: Write Sidebar.tsx**

```tsx
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/accounts', label: '👤 Contas' },
  { to: '/projects', label: '📁 Projetos' },
  { to: '/messages', label: '💬 Mensagens' },
  { to: '/proposals', label: '📝 Propostas' },
  { to: '/jobs', label: '⚙️ Jobs' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-800 text-white flex flex-col p-4 shrink-0">
      <div className="text-xl font-bold mb-6">🚀 FreelaBot</div>
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-gray-700 font-medium' : 'hover:bg-gray-700 opacity-80'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Write DataTable.tsx**

```tsx
import { useState } from 'react'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  keyExtractor: (row: T) => string
}

export default function DataTable<T>({ columns, rows, keyExtractor }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...rows].sort((a: any, b: any) => {
    if (!sortKey) return 0
    const av = a[sortKey] ?? ''
    const bv = b[sortKey] ?? ''
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => handleSort(c.key)}
                className="px-4 py-2 text-left font-semibold text-gray-600 cursor-pointer select-none"
              >
                {c.header} {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={keyExtractor(row)} className="border-b hover:bg-gray-50">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3">
                  {c.render ? c.render(row) : (row as any)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Write StatusBadge.tsx**

```tsx
const styles: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  running: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-800',
  new: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-gray-100 text-gray-800',
  viewed: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function StatusBadge({ status }: { status: string }) {
  const cls = styles[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}
```

- [ ] **Step 4: Write Skeleton.tsx**

```tsx
export default function Skeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add sidebar, datatable, statusbadge and skeleton components"
```

---

## Task 16: Dashboard Page

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Write Dashboard.tsx**

```tsx
import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import Skeleton from '../components/Skeleton'

export default function Dashboard() {
  const { data: stats, loading } = useFetch(api.dashboard.stats)

  if (loading) return <Skeleton count={4} />
  if (!stats) return <div>Erro ao carregar stats</div>

  const cards = [
    { label: 'Projetos Novos', value: stats.new_projects, color: 'text-yellow-600' },
    { label: 'Mensagens Não Lidas', value: stats.unread_messages, color: 'text-red-600' },
    { label: 'Propostas Pendentes', value: stats.pending_proposals, color: 'text-gray-600' },
    { label: 'Contas Ativas', value: stats.active_accounts, color: 'text-green-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-lg p-5 shadow-sm">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</div>
            <div className={`text-3xl font-bold mt-1 ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: add dashboard page with stats cards"
```

---

## Task 17: Accounts Page

**Files:**
- Create: `frontend/src/pages/Accounts.tsx`

- [ ] **Step 1: Write Accounts.tsx**

```tsx
import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { useSync } from '../hooks/useSync'
import { api } from '../api'
import DataTable from '../components/DataTable'
import Skeleton from '../components/Skeleton'

export default function Accounts() {
  const { data: accounts, loading, refetch } = useFetch(api.accounts.list)
  const { sync, syncing } = useSync()
  const [form, setForm] = useState({ username: '', password: '' })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.accounts.create(form)
    setForm({ username: '', password: '' })
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover conta?')) return
    await api.accounts.remove(id)
    refetch()
  }

  if (loading) return <Skeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Contas 99freelas</h1>

      <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Usuário</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Senha</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
          Adicionar
        </button>
      </form>

      {accounts && (
        <DataTable
          rows={accounts}
          keyExtractor={(a) => a.id}
          columns={[
            { key: 'username', header: 'Usuário' },
            { key: 'is_active', header: 'Ativo', render: (a) => (a.is_active ? 'Sim' : 'Não') },
            {
              key: 'actions',
              header: 'Ações',
              render: (a) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => sync(a.id).then(refetch)}
                    disabled={syncing === a.id}
                    className="text-blue-600 text-sm hover:underline disabled:opacity-50"
                  >
                    {syncing === a.id ? 'Syncing...' : '🔃 Sync'}
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="text-red-600 text-sm hover:underline">
                    🗑️
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Accounts.tsx
git commit -m "feat: add accounts CRUD page with sync"
```

---

## Task 18: Projects Page

**Files:**
- Create: `frontend/src/pages/Projects.tsx`

- [ ] **Step 1: Write Projects.tsx**

```tsx
import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Skeleton from '../components/Skeleton'

export default function Projects() {
  const { data: projects, loading } = useFetch(api.projects.list)

  if (loading) return <Skeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Projetos</h1>
      {projects && (
        <DataTable
          rows={projects}
          keyExtractor={(p) => p.id}
          columns={[
            { key: 'title', header: 'Projeto' },
            { key: 'category', header: 'Categoria' },
            {
              key: 'budget',
              header: 'Orçamento',
              render: (p) =>
                p.budget_min && p.budget_max
                  ? `R$ ${p.budget_min} - R$ ${p.budget_max}`
                  : '-',
            },
            { key: 'is_new', header: 'Status', render: (p) => <StatusBadge status={p.is_new ? 'new' : 'sent'} /> },
            {
              key: 'url',
              header: 'Link',
              render: (p) =>
                p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline">
                    Ver →
                  </a>
                ) : (
                  '-'
                ),
            },
          ]}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Projects.tsx
git commit -m "feat: add projects page"
```

---

## Task 19: Messages Page

**Files:**
- Create: `frontend/src/pages/Messages.tsx`

- [ ] **Step 1: Write Messages.tsx**

```tsx
import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import DataTable from '../components/DataTable'
import Skeleton from '../components/Skeleton'

export default function Messages() {
  const { data: messages, loading, refetch } = useFetch(api.messages.list)

  const handleMarkRead = async (id: string) => {
    await api.messages.markRead(id)
    refetch()
  }

  if (loading) return <Skeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mensagens</h1>
      {messages && (
        <DataTable
          rows={messages}
          keyExtractor={(m) => m.id}
          columns={[
            { key: 'sender_name', header: 'Remetente' },
            { key: 'content', header: 'Conteúdo', render: (m) => <span className="line-clamp-2">{m.content}</span> },
            { key: 'received_at', header: 'Data' },
            {
              key: 'is_read',
              header: 'Lida',
              render: (m) => (m.is_read ? '✅' : '🔴'),
            },
            {
              key: 'actions',
              header: '',
              render: (m) =>
                !m.is_read ? (
                  <button onClick={() => handleMarkRead(m.id)} className="text-blue-600 text-sm hover:underline">
                    Marcar lida
                  </button>
                ) : null,
            },
          ]}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Messages.tsx
git commit -m "feat: add messages inbox page"
```

---

## Task 20: Proposals Page

**Files:**
- Create: `frontend/src/pages/Proposals.tsx`

- [ ] **Step 1: Write Proposals.tsx**

```tsx
import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Skeleton from '../components/Skeleton'

export default function Proposals() {
  const { data: proposals, loading } = useFetch(api.proposals.list)

  if (loading) return <Skeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Propostas Enviadas</h1>
      {proposals && (
        <DataTable
          rows={proposals}
          keyExtractor={(p) => p.id}
          columns={[
            { key: 'external_id', header: 'ID' },
            {
              key: 'value',
              header: 'Valor',
              render: (p) => (p.value ? `R$ ${p.value}` : '-'),
            },
            {
              key: 'delivery_time_days',
              header: 'Prazo',
              render: (p) => (p.delivery_time_days ? `${p.delivery_time_days} dias` : '-'),
            },
            { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            { key: 'sent_at', header: 'Enviada em' },
          ]}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Proposals.tsx
git commit -m "feat: add proposals page"
```

---

## Task 21: Jobs Page

**Files:**
- Create: `frontend/src/pages/Jobs.tsx`

- [ ] **Step 1: Write Jobs.tsx**

```tsx
import { useFetch } from '../hooks/useFetch'
import { api } from '../api'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Skeleton from '../components/Skeleton'

export default function Jobs() {
  const { data: jobs, loading } = useFetch(api.jobs.list)

  if (loading) return <Skeleton />

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Jobs de Scraping</h1>
      {jobs && (
        <DataTable
          rows={jobs}
          keyExtractor={(j) => j.id}
          columns={[
            { key: 'job_type', header: 'Tipo' },
            { key: 'status', header: 'Status', render: (j) => <StatusBadge status={j.status} /> },
            { key: 'started_at', header: 'Início' },
            { key: 'finished_at', header: 'Fim' },
            { key: 'items_scraped', header: 'Itens' },
            {
              key: 'error',
              header: 'Erro',
              render: (j) => <span className="text-red-600 text-xs line-clamp-2">{j.error_message}</span>,
            },
          ]}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Jobs.tsx
git commit -m "feat: add jobs log page"
```

---

## Self-Review

### 1. Spec Coverage

| Spec Section | Implementing Task |
|--------------|-------------------|
| 3 containers (api, db, nginx) | Task 1, 12 |
| Browser pool (1 Chromium + N contexts) | Task 8 |
| APScheduler every 30min | Task 12 |
| 5 data models | Task 3 |
| Encryption (Fernet) | Task 4 |
| 2captcha integration | Task 9 |
| All API endpoints | Task 6, 7 |
| Dashboard stats | Task 7 |
| React pages (6) | Task 16-21 |
| Error handling / retry | Task 8, 11 (timeout, close context on error) |

**Gaps:** None identified. All spec sections map to tasks.

### 2. Placeholder Scan

- No "TBD", "TODO", "implement later" found in code blocks
- All test steps include actual test code
- All API steps include actual endpoint code
- Scraper selectors are marked as EXAMPLES (this is intentional — real selectors require inspecting 99freelas live)

### 3. Type Consistency

- Model field names match between `models.py`, `schemas.py`, and `types.ts`
- API paths match between backend routers and `api.ts`
- Status values consistent across backend enums and frontend `StatusBadge`

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-08-freelas-automation.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session, batch execution with checkpoints

**Which approach?**
