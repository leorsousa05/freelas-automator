# Tasks

## Backend
- [x] Reproduce scraper failure via API call (not isolated test)
- [x] Fix `scrape_conversations` — use DOM evaluate, normalize URLs, parse timestamps
- [x] Fix `scrape_conversation_messages` — correct selectors, message ID regex
- [x] Verify `upsert_conversation` overwrites all fields including `project_id`, `is_system`
- [x] Test end-to-end: API sync → DB → API list

## Frontend
- [x] Add Conversation + ConversationMessage types
- [x] Add API client methods
- [x] Build 3-column Messages page layout
- [x] Add auto-polling intervals (30s conversations, 15s messages)
- [x] Add last-sync timestamp display

## Verification
- [x] Screenshot of Messages page with real data
- [x] Confirm data flows through API correctly
