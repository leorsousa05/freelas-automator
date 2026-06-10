# Design: Refactor Scraper into Modules + Authenticated Page Helper

## Module Split

```
app/worker/scraper/
├── __init__.py        ← public exports
├── constants.py       ← LOGIN_URL, BASE_URL, TURNSTILE_SITE_KEY, CATEGORIES
├── parsers.py         ← parse_info_text, parse_budget, parse_brl
├── auth.py            ← ensure_logged_in
├── projects.py        ← scrape_projects, scrape_project_detail, scrape_project_full
├── proposals.py       ← scrape_project_proposals
├── messages.py        ← scrape_messages
├── my_proposals.py    ← scrape_my_proposals
└── sync.py            ← run_full_sync
```

## Authenticated Page Helper

### Pattern (before)
```python
page_obj, new_cookies = await ensure_logged_in(
    str(account.id),
    account.username,
    account.password_encrypted,
    account.session_cookies,
)
try:
    result = await scrape_something(page_obj, ...)
    account.session_cookies = new_cookies
    account.last_login_at = datetime.utcnow()
    db.commit()
    return result
finally:
    await page_obj.close()
```

### Pattern (after)
```python
async with with_authenticated_page(account_id, db) as page:
    result = await scrape_something(page, ...)
    return result
```

### Contract
```python
@asynccontextmanager
async def with_authenticated_page(
    account_id: UUID,
    db: Session,
) -> AsyncGenerator[Page, None]:
    """
    Yields a logged-in Playwright Page for the given account.
    Automatically:
    - loads account from DB (404 if missing)
    - calls ensure_logged_in()
    - updates session_cookies + last_login_at on success
    - commits DB
    - closes page on exit
    """
```

## Project DB Upsert Helper

### Contract
```python
def upsert_project_from_detail(
    db: Session,
    account_id: UUID,
    external_id: str,
    detail: dict,
) -> Project:
    """
    Update existing project or create new one from scraped detail dict.
    Sets scraped_at and cached_at to now().
    """
```

## API Refactor

| Endpoint | Before lines | After lines |
|----------|-------------|-------------|
| `POST /projects/scrape` | ~70 | ~25 |
| `GET /projects/{id}/detail` | ~85 | ~15 |
| `GET /projects/{id}/full` | ~90 | ~20 |
| `GET /projects/{id}/proposals` | ~35 | ~15 |
| `GET /accounts/{id}/projects` | ~30 | ~15 |
