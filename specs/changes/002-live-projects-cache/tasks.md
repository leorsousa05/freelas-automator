# Tasks: Live Projects + Cache

## Backend

- [x] Add `cached_at` and new fields to Project model
- [x] Fix `run_full_sync` upsert (replace merge with select+update/insert)
- [x] Add `category` filter to `GET /api/projects` with slug mapping
- [x] Fix `scrape_project_proposals` to use full project URL
- [x] Add login cache in BrowserPool (30min freshness)
- [x] Increase Playwright timeouts to 60s with try/except
- [x] Set scheduler interval to 15 minutes

## Frontend

- [x] Create `Modal.tsx` component
- [x] Update `Projects.tsx` to always scrape live
- [x] Add project detail modal with proposals
- [x] Remove stale status badge from proposals (unreliable HTML)
- [x] Update `api.ts` to pass category to list()
- [x] Update `DataTable` with `onRowClick` prop

## Tests

- [x] Fix `test_schemas.py` for new Project fields
- [x] All 5 backend tests pass
- [x] Frontend build passes (tsc + vite)

## Verification

- [x] Scrape returns 10 projects per page
- [x] Category filter works (slug -> name mapping)
- [x] Modal opens with proposals
- [x] Login cache speeds up subsequent calls
- [x] Background scheduler runs without UNIQUE constraint errors