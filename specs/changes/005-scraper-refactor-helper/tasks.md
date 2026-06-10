# Tasks: Refactor Scraper into Modules + Authenticated Page Helper

## Part A — Module Split (DONE without SDD, now documented)
- [x] 1. Create `constants.py`, `parsers.py`, `auth.py`
- [x] 2. Create `projects.py`, `proposals.py`, `messages.py`, `my_proposals.py`
- [x] 3. Create `sync.py`
- [x] 4. Update `__init__.py` exports
- [x] 5. Delete old `scraper.py`
- [x] 6. Fix import paths across codebase
- [x] 7. Clean up `accounts.py` imports
- [x] 8. Fix `scheduler.py` redundant UUID + double SessionLocal

## Part B — Helpers
- [x] 1. Create `with_authenticated_page()` in `app.worker.scraper.helpers`
- [x] 2. Create `upsert_project_from_detail()` in `app.crud`
- [x] 3. Refactor `POST /projects/scrape` to use helpers
- [x] 4. Refactor `GET /projects/{id}/detail` to use helpers
- [x] 5. Refactor `GET /projects/{id}/full` to use helpers
- [x] 6. Refactor `GET /projects/{id}/proposals` to use helpers
- [x] 7. Refactor `GET /accounts/{id}/projects` to use helpers
- [x] 8. Test backend boots and endpoints work
- [x] 9. Update `specs/living/` docs
