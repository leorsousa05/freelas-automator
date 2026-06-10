# Tasks

## Backend
- [x] Add `send_message()` to `app/worker/scraper/messages.py`
- [x] Add `POST /api/conversations/{conversation_id}/send` route
- [x] Handle 99freelas response parsing and errors
- [x] Test endpoint without actually triggering send (mock or verify request shape)

## Frontend
- [x] Add `api.conversations.send()` method
- [x] Build composer UI in Messages page
- [x] Wire send button + error handling + input clear + message refetch

## Verification
- [x] API endpoint returns success for valid request shape
- [x] UI shows composer and handles sending state
- [ ] User validates real message delivery on 99freelas
