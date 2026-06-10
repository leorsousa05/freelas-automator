# Spec Delta: Projects Page (Live + Cache)

## ADDED

### Backend
- `Project.cached_at`: DateTime field for cache freshness tracking
- `Project.subcategory`, `experience_level`, `proposals_count`, `interested_count`, `client_name`: New scraped fields
- `GET /api/projects/{external_id}/is-stale`: Returns `{stale: bool, minutes_ago: float}`
- `GET /api/projects/{external_id}/proposals`: Scrapes proposals from project URL (not just ID)
- `POST /api/projects/scrape`: Accepts `category` and `page` params, upserts to DB
- Category slug mapping in `list_projects`: Converts "web-mobile-e-software" -> "Web, Mobile & Software"
- Login cache in BrowserPool: 30-minute freshness to avoid repeated 2captcha
- Playwright timeouts: 60s with try/except fallback

### Frontend
- `Modal.tsx`: Reusable modal component with close button and scrollable content
- `Projects.tsx`: Always calls `api.projects.scrape()` on load (no cache for display)
- `Projects.tsx`: Modal on row click showing project detail + proposals list
- `DataTable.tsx`: `onRowClick` prop added
- `api.ts`: `list()` accepts optional `category` param

## MODIFIED

### Backend
- `scrape_project_proposals()`: Now accepts `project_url` to navigate with slug (fixes 0 proposals bug)
- `run_full_sync()`: Replaced `db.merge()` with explicit select + update/insert (fixes UNIQUE constraint)
- `app/config.py`: `scheduler_interval_minutes` changed from 30 -> 15

### Frontend
- `Projects.tsx`: Removed cached-first logic, stale checking, and "Forçar atualização" button state
- `types.ts`: `ProposalItem.status` removed (unreliable from HTML templates)

## REMOVED

- Frontend cache display: No more "Atualizado em HH:MM:SS" or stale badges
- Proposal status badges: 99freelas uses CSS-only visibility that Playwright cannot detect
