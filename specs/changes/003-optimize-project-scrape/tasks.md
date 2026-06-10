# Tasks: Optimize Project Detail + Proposals Scraping

- [x] 1. Analyze timing from backend logs
- [x] 2. Create SDD spec folder (003)
- [ ] 3. Add `scrape_project_full()` in `app/worker/scraper.py`
  - Navigate once to project URL
  - Wait `domcontentloaded` instead of `networkidle`
  - Parse detail fields
  - Parse proposals from same HTML
  - Return `{ detail, proposals }`
- [ ] 4. Add `GET /{external_id}/full` endpoint in `app/api/projects.py`
- [ ] 5. Add `api.projects.full()` method in frontend `src/api.ts`
- [ ] 6. Update `openProjectModal()` in `src/pages/Projects.tsx` to use `/full`
- [ ] 7. Test modal load time
- [ ] 8. Update `specs/living/` documentation
