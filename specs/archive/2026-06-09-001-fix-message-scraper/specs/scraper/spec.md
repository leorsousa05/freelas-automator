# Scraper Delta

## MODIFIED: `app/worker/scraper/messages.py`

### `scrape_conversations(page)`
- ADD: Wait for `.conversa-item.clone` to appear after clicking `.directory-inbox`
- ADD: Use `page.evaluate()` to extract from rendered DOM (not BeautifulSoup on raw HTML)
- ADD: Normalize photo URL — if `src`/`data-src` lacks `http` prefix, prepend CDN base
- ADD: Check `window.getComputedStyle(identity).display !== 'none'` for verified badge
- ADD: Parse `cp-datetime` timestamp (ms) via `_parse_timestamp_ms()`
- FIX: Set `is_system: False` for DOM fallback (was leaking from old JSON data)
- REMOVE: Broken BeautifulSoup fallback for `.container-conversas` (DOM is dynamic)

### `scrape_conversation_messages(page, conversation_external_id)`
- ADD: Wait for `.message-item:not(.clone):not(.model)` to appear
- ADD: Use `page.evaluate()` for DOM extraction
- ADD: Extract message ID via regex `/^message-(\d+)$/` on classList (avoids `message-item` false match)
- ADD: Detect `sent_by_me` by comparing message photo with logged-in user photo
- ADD: Normalize photo URL same as conversations
- FIX: Parse `cp-datetime` as timestamp in milliseconds

## MODIFIED: `frontend/src/pages/Messages.tsx`
- ADD: `useEffect` interval — sync conversations every 30s when page is mounted
- ADD: `useEffect` interval — sync messages every 15s when a conversation is selected
- ADD: Display last-sync timestamp in UI
- ADD: Visual indicator when auto-sync is running
