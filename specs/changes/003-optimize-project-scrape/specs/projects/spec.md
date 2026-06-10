# Project Scraping Specification (v2)

## Overview

Project detail and proposals are scraped from the same 99freelas project page. To reduce load time, a unified scraper extracts both in a single browser navigation.

## Data Model

### Project (unchanged)
All fields from v1 remain. Detail scraper populates the same fields.

### Proposal (unchanged)
All fields from v1 remain. Proposal scraper populates the same fields.

## Scrapers

### `scrape_project_full(page, project_path)` — NEW

**Parameters:**
- `page` — Playwright Page instance (already logged in)
- `project_path` — string, e.g., `/project/criacao-de-site...-758450`

**Behavior:**
1. Navigate to `BASE_URL + project_path`
2. Wait for `domcontentloaded` (timeout 60s)
3. Sleep 2s for JS hydration
4. Extract detail fields (same as `scrape_project_detail`)
5. Extract proposals from `.proposal-list .proposal-item` (same as `scrape_project_proposals`)
6. Return `{ detail: dict, proposals: list[dict] }`

**Removed:**
- `networkidle` wait (was causing 30s+ delays)

### `scrape_project_detail()` — MODIFIED
- Reduce wait from `networkidle` to `domcontentloaded`
- Keep all parsing logic unchanged

### `scrape_project_proposals()` — MODIFIED
- Reduce wait from `networkidle` to `domcontentloaded`
- Keep all parsing logic unchanged

## API

### `GET /api/projects/{external_id}/full?account_id={uuid}` — NEW

**Returns:**
```json
{
  "detail": { /* ProjectOut shape */ },
  "proposals": [ /* ProposalItem shape */ ]
}
```

**Behavior:**
1. `ensure_logged_in()` once
2. Call `scrape_project_full(page, project_path)`
3. Save detail fields to DB (upsert Project)
4. Return both detail and proposals

## Frontend

### `api.projects.full(externalId, accountId)` — NEW
- Calls `GET /api/projects/{external_id}/full?account_id={accountId}`

### Modal flow — CHANGED
**Before:**
1. `api.projects.detail(id)` → set detail
2. `api.projects.proposals(id)` → set proposals

**After:**
1. `api.projects.full(id, accountId)` → set both detail and proposals
