# Proposal: Optimize Project Detail + Proposals Scraping

## Problem

Opening a project modal currently triggers **two separate browser navigations** to the same 99freelas project page:

1. `GET /api/projects/{id}/detail` — scrapes project metadata
2. `GET /api/projects/{id}/proposals` — scrapes proposals list

Each call also runs `ensure_logged_in()` which creates a new browser page. The detail endpoint waits for `networkidle` which on the 99freelas project page can take **30+ seconds** due to analytics, ads, and third-party scripts.

Observed timing from logs:
- First detail scrape: **34 seconds**
- Proposals scrape: **4 seconds**
- Total modal load: **~38 seconds**

## Goals

1. **Reduce detail page wait time** by using `domcontentloaded` instead of `networkidle`
2. **Unify detail + proposals into a single navigation** since both are on the same HTML page
3. **Reuse a single page/context** instead of creating two separate browser pages per modal
4. Target: **modal loads in < 10 seconds** (down from ~38s)
