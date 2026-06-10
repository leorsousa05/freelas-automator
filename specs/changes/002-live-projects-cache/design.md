# Design: Live Projects + Cache

## Architecture

```
User -> Frontend -> POST /api/projects/scrape (live)
                    -> Returns projects directly from 99freelas

Scheduler -> Background -> POST /api/projects/scrape (cached)
                         -> Saves to DB every 15 min
```

## Data Flow

### Frontend (Live)
1. User selects account + category
2. Frontend calls `api.projects.scrape()` immediately
3. Shows Skeleton while loading
4. Displays projects + "Dados ao vivo do 99freelas"
5. Click row -> Modal with detail + proposals

### Background (Cache)
1. APScheduler triggers every 15 min
2. Calls `run_full_sync()` for each active account
3. Upserts projects/messages/proposals to DB
4. Used by Dashboard and other non-live features

## API Changes

### Modified Endpoints
- `POST /api/projects/scrape` — Now accepts `project_url` for proposals
- `GET /api/projects` — Added `category` filter with slug-to-name mapping
- `GET /api/projects/{id}/proposals` — Uses full project URL to scrape

## Models

### Project (updated)
```
+ cached_at: DateTime (nullable)
+ subcategory: String
+ experience_level: String
+ proposals_count: Integer
+ interested_count: Integer
+ client_name: String
```

## Error Handling

- Playwright timeouts: 60s with fallback to partial HTML
- 2captcha failures: Retry once, then fail job
- UNIQUE constraint: Upsert by (external_id, account_id) instead of merge

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/pages/Projects.tsx` | Always call scrape(), added Modal |
| `frontend/src/components/Modal.tsx` | New component |
| `frontend/src/api.ts` | Added category param to list() |
| `backend/app/api/projects.py` | Category filter, URL-based proposals |
| `backend/app/worker/scraper.py` | Timeouts 60s, upsert fix, URL fix |
| `backend/app/worker/pool.py` | Login cache (30min) |
| `backend/app/config.py` | scheduler_interval = 15 |
| `backend/app/models.py` | Added cached_at + new fields |