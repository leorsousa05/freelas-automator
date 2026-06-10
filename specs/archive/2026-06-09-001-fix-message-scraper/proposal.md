# Fix Message Scraper + Auto-Polling

## WHY

The conversation scraper works in isolated tests but returns corrupted data when called through the API:
- `client_photo_url` is truncated (missing base URL)
- `last_message_at` is null (timestamp not extracted)
- `is_system` incorrectly set to true (field leakage from old data)
- DOM evaluate returns different results depending on browser context state

Additionally, the frontend Messages page does not auto-refresh. Users must manually click "Sync" to see new messages.

## Scope

1. Fix `scrape_conversations()` to reliably extract data from rendered DOM
2. Fix `scrape_conversation_messages()` to use correct selectors
3. Add auto-polling (30s for conversations, 15s for messages) on frontend
4. End-to-end test with real 99freelas account data

## Constraints

- Must work through `with_authenticated_page()` context manager
- Must handle empty `novasMensagens` JSON fallback
- Must not break existing project/proposal scrapers
