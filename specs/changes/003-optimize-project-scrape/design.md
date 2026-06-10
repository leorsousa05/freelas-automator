# Design: Optimize Project Detail + Proposals Scraping

## Architecture

### Before (2 navigations)
```
Frontend modal open
  ├─→ GET /detail
  │     ├─ ensure_logged_in() → new page
  │     ├─ page.goto(project_url) + wait networkidle (30s)
  │     └─ scrape detail fields
  └─→ GET /proposals
        ├─ ensure_logged_in() → new page
        ├─ page.goto(project_url) + wait networkidle (4s)
        └─ scrape proposals
```

### After (1 navigation)
```
Frontend modal open
  └─→ GET /full
        ├─ ensure_logged_in() → new page
        ├─ page.goto(project_url) + wait domcontentloaded (~3s)
        ├─ scrape detail fields
        ├─ scrape proposals (same HTML)
        └─ return { detail, proposals }
```

## Changes

### Backend

| File | Change |
|------|--------|
| `app/worker/scraper.py` | Add `scrape_project_full(page, project_path)` — single function that extracts detail + proposals from one page load. Reduce `networkidle` to `domcontentloaded` or just `sleep(1)` after goto. |
| `app/api/projects.py` | Add `GET /{external_id}/full` endpoint that calls `scrape_project_full()` and saves detail to DB. Remove separate `/detail` and `/proposals` calls from modal flow. |

### Frontend

| File | Change |
|------|--------|
| `src/api.ts` | Add `api.projects.full(externalId, accountId)` method |
| `src/pages/Projects.tsx` | Update `openProjectModal()` to call `api.projects.full()` once instead of detail + proposals separately |

## API Contract

```
GET /api/projects/{external_id}/full?account_id={uuid}

Response:
{
  "detail": { /* same as scrape_project_detail */ },
  "proposals": [ /* same as scrape_project_proposals */ ]
}
```

## Edge Cases

- **Proposals lazy-loaded**: On 99freelas, the proposals list may be server-rendered (already in HTML) or loaded via JS. The current scraper reads from initial HTML which works. If proposals are ever truly lazy-loaded, we'd need to scroll or click "load more".
- **Page without proposals section**: If the project page doesn't have proposals (e.g., private project), return empty array.
- **Login still required**: `ensure_logged_in()` is still called once. Fast path (cookies) keeps it instant.
