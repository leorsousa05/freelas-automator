# Freelas Automation Platform

A full-stack web application that automates monitoring and interaction with [99freelas.com.br](https://www.99freelas.com.br) — a Brazilian freelancing platform. It scrapes project listings, conversations, messages, and proposals; stores them in a database; and exposes a modern React dashboard for browsing and managing everything in one place.

---

## Features

- **Multi-Account Management** — Manage multiple 99freelas accounts with encrypted credentials
- **Live Project Scraping** — Scrape project listings by category with real-time data
- **Project Details & Proposals** — View project details and competing proposals
- **Conversation Sync** — Scrape and sync conversations/messages with clients
- **Proposal Tracking** — Track sent proposals and their status
- **Background Scheduler** — Automatic sync of all active accounts on a configurable interval
- **Dashboard** — Modern React UI with filtering, pagination, and real-time updates

---

## Tech Stack

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

## Quick Start

### Prerequisites

- Python 3.11+ with `venv`
- Node.js 18+ with `npm`
- Playwright (`playwright install chromium`)

### 1. Clone & Setup

```bash
git clone https://github.com/leorsousa05/freelas-automator.git
cd freelas-automator
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

Create a `.env` file (copy from `.env.example`) and fill in:

```bash
DATABASE_URL=postgresql://freelas:freelas@db:5432/freelas
ENCRYPTION_KEY=your-base64-encoded-32-byte-key
TWOCAPTCHA_API_KEY=your-2captcha-key
SCHEDULER_INTERVAL_MINUTES=15
MAX_WORKERS=5
```

> **Security:** Never commit `.env`. The `ENCRYPTION_KEY` must be exactly 32 bytes.

Run the backend:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend runs at `http://localhost:8000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` with Vite proxying `/api` to `localhost:8000`.

---

## Docker Compose (Production-like)

```bash
docker-compose up --build
```

Exposes Nginx on port `80`.

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory
│   │   ├── config.py            # Pydantic Settings
│   │   ├── database.py          # SQLAlchemy engine & session
│   │   ├── models.py            # ORM models
│   │   ├── schemas.py           # Pydantic request/response
│   │   ├── crud.py              # Upsert helpers
│   │   ├── encryption.py        # Fernet AES-128 encryption
│   │   ├── api/                 # FastAPI routers
│   │   └── worker/              # Scraping workers
│   ├── tests/                   # pytest suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api.ts               # Typed fetch wrappers
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── pages/               # Dashboard, Accounts, Projects, etc.
│   │   ├── components/          # DataTable, Modal, Sidebar, etc.
│   │   └── hooks/               # useFetch, useSync
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── nginx.conf
└── specs/                       # Living design specs
```

---

## Testing

```bash
cd backend
source venv/bin/activate
pytest
```

Tests use an in-memory SQLite database. Frontend tests are not currently configured.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://freelas:freelas@db:5432/freelas` |
| `ENCRYPTION_KEY` | Fernet key for password encryption (32 bytes) | *(required)* |
| `TWOCAPTCHA_API_KEY` | 2captcha API key for Cloudflare Turnstile | *(required)* |
| `SCHEDULER_INTERVAL_MINUTES` | Background sync interval | `15` |
| `MAX_WORKERS` | Scraping concurrency limit | `5` |

---

## License

[MIT](LICENSE)

---

## Author

Made by [Leonardo Ribeiro](https://github.com/leorsousa05).
