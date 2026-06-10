# Proposal: Refactor Scraper into Modules + Authenticated Page Helper

## Problem

The backend had a single 800+ line `scraper.py` monolith that mixed concerns:
- Login/auth logic
- HTML parsing utilities
- Project list/detail/proposals scraping
- Message scraping
- My-proposals scraping
- Full sync orchestration

Additionally, **every scraping API endpoint duplicates the same 10-line login pattern**:
1. Query account by ID
2. Call `ensure_logged_in()`
3. Scrape
4. Update cookies + `last_login_at`
5. Commit DB
6. Close page in `finally`

This duplication exists in:
- `POST /api/projects/scrape`
- `GET /api/projects/{id}/detail`
- `GET /api/projects/{id}/full`
- `GET /api/projects/{id}/proposals`
- `GET /api/accounts/{id}/projects`

And project DB upsert logic is copy-pasted across 3 endpoints with ~20 fields each.

## Goals

1. **Split `scraper.py` into focused modules** under `app.worker.scraper`:
   - `constants.py` — URLs, site keys, category map
   - `parsers.py` — text/budget parsing helpers
   - `auth.py` — login & session management
   - `projects.py` — project scraping (list, detail, full)
   - `proposals.py` — proposal scraping wrapper
   - `messages.py` — message scraping
   - `my_proposals.py` — my-proposals scraping
   - `sync.py` — full sync orchestration

2. **Create `with_authenticated_page()` helper** — an async context manager that encapsulates the login/update/close pattern so endpoints become ~5 lines.

3. **Create `upsert_project_from_detail()` helper** — centralize the 20-field project DB update/insert logic.

4. **Clean up `accounts.py`** — move imports from middle of file to top.

5. **Fix `scheduler.py`** — remove redundant `uuid_module.UUID(str(...))` and double `SessionLocal()`.
