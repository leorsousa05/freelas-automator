# Freelas Automation Platform

AI agent guide for the Freelas Automation Platform. This file is written for AI coding agents who need to understand and modify the project.

> **Language note:** The codebase itself (variables, comments, APIs) is in English. User-facing UI text and some project documentation (e.g. `RUN.md`, `specs/`) are in Portuguese.

---

## Project Overview

This is a full-stack web application that automates monitoring and interaction with **99freelas.com.br** (a Brazilian freelancing platform). It scrapes project listings, messages, conversations, and proposals; stores them in a database; and exposes a React dashboard for browsing and managing the data.

Key capabilities:
- Manage multiple 99freelas accounts with encrypted credentials
- Scrape project listings by category with live data
- View project details and competing proposals
- Scrape and sync conversations/messages
- Track sent proposals and their status
- Background scheduler that syncs all active accounts automatically

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router DOM v6 |
| Database | PostgreSQL (production) / SQLite (development & tests) |
| Browser Automation | Playwright (Chromium) |
| Scheduler | APScheduler (asyncio) |
| HTML Parsing | BeautifulSoup4 |
| Captcha Solving | 2captcha (Cloudflare Turnstile) |
| Deployment | Docker Compose (PostgreSQL + FastAPI + Nginx) |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory, lifespan, router registration
│   │   ├── config.py            # Pydantic Settings (env vars)
│   │   ├── database.py          # SQLAlchemy engine, SessionLocal, Base
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── crud.py              # Upsert helpers for Project / Conversation / Message
│   │   ├── encryption.py        # Fernet AES-128 encryption for passwords
│   │   ├── api/                 # FastAPI routers
│   │   │   ├── accounts.py
│   │   │   ├── projects.py
│   │   │   ├── messages.py
│   │   │   ├── proposals.py
│   │   │   ├── conversations.py
│   │   │   ├── jobs.py
│   │   │   └── dashboard.py
│   │   └── worker/              # Scraping workers
│   │       ├── scheduler.py     # APScheduler full_sync runner
│   │       ├── pool.py          # Playwright Browser + Context pool
│   │       ├── captcha.py       # 2captcha integration
│   │       └── scraper/         # Scraper modules
│   │           ├── auth.py      # Login flow with cookie restore
│   │           ├── constants.py # URLs, categories, site keys
│   │           ├── helpers.py   # with_authenticated_page context manager
│   │           ├── parsers.py   # Text parsing utilities
│   │           ├── projects.py  # Project list/detail/proposals scrapers
│   │           ├── messages.py  # Conversation / message scrapers
│   │           ├── my_proposals.py
│   │           ├── proposals.py
│   │           └── sync.py      # Full sync orchestrator
│   ├── tests/                   # pytest suite
│   ├── requirements.txt
│   ├── alembic.ini
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # React root + BrowserRouter
│   │   ├── App.tsx              # Layout (Sidebar + Routes)
│   │   ├── api.ts               # Typed fetch wrappers for all API endpoints
│   │   ├── types.ts             # TypeScript interfaces matching backend schemas
│   │   ├── index.css            # Tailwind directives
│   │   ├── pages/               # Dashboard, Accounts, Projects, Messages, Proposals, Jobs
│   │   ├── components/          # DataTable, Modal, Sidebar, Skeleton, StatusBadge
│   │   └── hooks/               # useFetch, useSync
│   ├── package.json
│   ├── vite.config.ts           # Dev server + /api proxy to localhost:8000
│   ├── tailwind.config.js
│   └── tsconfig.json
├── docker-compose.yml           # 3 services: db, api, nginx
├── nginx.conf                   # Serves static frontend + proxies /api to api:8000
├── specs/                       # Living design specs and archived changes
│   ├── living/                  # Current architecture & scraper specs
│   ├── changes/                 # Incremental change specs (numbered)
│   ├── archive/                 # Archived completed specs
│   └── templates/               # Spec templates
└── RUN.md                       # Local development runbook (Portuguese)
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
DATABASE_URL=postgresql://freelas:freelas@db:5432/freelas
ENCRYPTION_KEY=base64-encoded-32-byte-key    # Required; used for Fernet password encryption
TWOCAPTCHA_API_KEY=your-2captcha-key         # Required for Cloudflare Turnstile solving
SCHEDULER_INTERVAL_MINUTES=30                # Background sync interval (default 15)
MAX_WORKERS=5                                # Scraping concurrency limit
```

> **Security:** Never commit `.env`. The `ENCRYPTION_KEY` must be exactly 32 bytes (padded with zeros if shorter by `encryption.py`).

---

## Build and Run Commands

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
export ENCRYPTION_KEY="your-32-byte-key"
export TWOCAPTCHA_API_KEY="your-key"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Backend runs at `http://localhost:8000`.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173` with Vite proxying `/api` to `localhost:8000`.

### Docker Compose (Production-like)
```bash
docker-compose up --build
```
Exposes Nginx on port `80`.

---

## Testing

Backend tests use **pytest** with an in-memory SQLite database (`test.db`):

```bash
cd backend
source venv/bin/activate
pytest
```

Test files:
- `tests/conftest.py` — Sets `DATABASE_URL` and `ENCRYPTION_KEY` env vars before imports
- `tests/test_api.py` — FastAPI `TestClient` smoke tests (account CRUD)
- `tests/test_encryption.py` — Fernet encrypt/decrypt roundtrip
- `tests/test_schemas.py` — Pydantic schema validation tests

No frontend tests are currently configured.

---

## Code Style Guidelines

### Backend (Python)
- **Python 3.11+** with type hints throughout (`str | None`, `UUID`, etc.)
- **FastAPI** dependency injection pattern: `db: Session = Depends(get_db)`
- **SQLAlchemy 2.0** declarative base; models use `Column(...)` explicitly
- **Pydantic v2** schemas use `ConfigDict(from_attributes=True)` for ORM mode
- All primary keys are `UUID` (default `uuid.uuid4`)
- Upsert pattern: query by unique constraint (`external_id` + `account_id`), then update or insert
- Log format: use structured prefixes like `[API]`, `[LOGIN]`, `[SYNC]`, `[SCRAPE-LIST]` for grep-friendly logs
- Exceptions in scrapers trigger `close_context(account_id)` to force re-login on next attempt

### Frontend (TypeScript/React)
- **React 18** functional components with hooks
- **TypeScript** strict mode enabled (`noUnusedLocals`, `noUnusedParameters`)
- **Tailwind CSS** utility classes; no custom CSS files except `index.css`
- API abstraction in `api.ts` — all fetch calls go through typed wrapper functions
- Custom hooks: `useFetch` for data fetching with loading/error states
- `useRef` used for frontend-side caches (e.g. `Projects.tsx` caches list/detail for 5 minutes)

---

## Architecture Details

### Browser Pool
- One global Chromium instance (`pool.py`)
- One `BrowserContext` per account (isolated sessions)
- Login cached for 30 minutes; cookie restore attempted first
- On scraper errors, the context is closed to force a fresh login

### Scheduler
- `APScheduler` runs `full_sync` every `SCHEDULER_INTERVAL_MINUTES`
- Iterates over all `Account.is_active == True`
- Creates a `ScrapingJob` record per run for observability

### Scraping Flow
1. `auth.ensure_logged_in()` — Cookie restore → captcha solve (if needed) → login → save cookies
2. `sync.run_full_sync()` — Scrape projects → upsert to DB → scrape conversations → scrape my proposals
3. Individual live endpoints (e.g. `/api/projects/scrape`, `/api/projects/{id}/detail`) use `with_authenticated_page` context manager

### Database Models
| Model | Purpose |
|-------|---------|
| `Account` | 99freelas login credentials (encrypted password), session cookies |
| `Project` | Scraped project listings; upserted by `external_id + account_id` |
| `Message` | Legacy simple messages |
| `Conversation` | Conversation threads with clients |
| `ConversationMessage` | Individual messages inside a conversation |
| `Proposal` | Proposals sent by the freelancer |
| `ScrapingJob` | Audit log of every sync job (status, items_scraped, error) |

### Caching Strategy
| Context | Behavior |
|---------|----------|
| Projects page | Always live-scrapes from 99freelas; frontend caches for 5 min in `useRef` |
| Project detail modal | Live-scrapes detail + proposals; cached for 5 min |
| Dashboard / Jobs / Proposals | Reads from DB cache |
| Background scheduler | Scrapes + writes to DB every interval |

---

## Security Considerations
- Passwords are encrypted with Fernet (AES-128) before storage; never stored plaintext
- Session cookies are stored in the DB (encrypted at rest via the same key)
- `ENCRYPTION_KEY` must be kept secret and be 32 bytes
- CORS is currently open (`allow_origins=["*"]`) — tighten for production
- Captcha solving uses external 2captcha service; API key is required
- Playwright runs with `--no-sandbox` in Docker; acceptable for containerized deployment but avoid on shared hosts

---

## Deployment

Docker Compose orchestrates three services:
1. `db` — PostgreSQL 15 Alpine
2. `api` — FastAPI container with Playwright Chromium pre-installed
3. `nginx` — Serves `frontend/dist` static files and reverse-proxies `/api` to the API service

Nginx config (`nginx.conf`) uses `try_files` for SPA routing so React Router works on refresh.

---

## Adding New API Endpoints

1. Add Pydantic schema to `app/schemas.py` if needed
2. Add router logic in `app/api/<resource>.py`
3. Register router in `app/main.py` with prefix and tags
4. Add frontend type to `frontend/src/types.ts` if consumed by UI
5. Add frontend API wrapper to `frontend/src/api.ts`
6. Write pytest test in `backend/tests/`

---

## Common Pitfalls
- **Playwright contexts must be closed on error** — `pool.py::close_context` is called in exception handlers to avoid stale sessions
- **Account IDs are UUIDs** — always convert `str` ↔ `UUID` carefully when passing between router and scraper
- **Frontend cache uses `useRef`** — state changes do not invalidate it; explicit `force=true` or page reload required
- **SQLite vs PostgreSQL** — Development defaults to SQLite (`dev.db`); production uses PostgreSQL. Some SQL features (like `UUID` type) are dialect-specific and handled by SQLAlchemy.
- **Alembic is configured but migrations folder is not present** — If you need migrations, run `alembic init alembic` inside `backend/`.
