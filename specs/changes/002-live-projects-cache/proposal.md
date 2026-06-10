# Proposal: Live Projects + Cache Strategy

## Motivation

User wants real-time project data when browsing the frontend, while keeping background automation efficient. The previous approach required clicking "Update" twice and showed stale data.

## Scope

1. **Frontend Projects page**: Always scrape live from 99freelas on load
2. **Background scheduler**: Scrape every 15 minutes and cache to DB
3. **Project detail modal**: Click row to open modal with description + proposals
4. **Category filter**: Works with both live scrape and cached data

## Constraints

- 99freelas shows 10 projects per page
- Scraping takes 10-30s (Playwright + 2captcha)
- Must handle timeouts gracefully
- SQLite for dev, PostgreSQL for prod

## Out of Scope

- Real-time WebSocket updates
- Push notifications
- Bidirectional sync (sending proposals)