# Message Scraper Specification

## Source of Truth

### `app/worker/scraper/messages.py`

#### `scrape_conversations(page)`
Navigates to `/messages`, triggers conversation list rendering by clicking `.directory-inbox`, waits for `.conversa-item.clone`, then extracts data from the rendered DOM via `page.evaluate()`.

Data extracted per conversation:
- `external_id`: `data-id` attribute
- `client_name`: `.pessoa-name` text
- `client_photo_url`: `.conversa-item-img` `data-src` or `src`, normalized to full CDN URL
- `client_verified`: `.icon-identity` exists AND `display !== 'none'`
- `project_name`: `.project-name` text
- `last_message_snippet`: `.item-description .text`
- `last_message_at`: `.dh-envio` `cp-datetime` parsed as ms timestamp
- `unread`: `!classList.contains('visualizada')`

JSON embedded in HTML (`novasMensagens`) is used only as fallback when DOM yields no results.

#### `scrape_conversation_messages(page, conversation_external_id)`
Navigates to `/messages/inbox/{id}`, waits for real message items, extracts from rendered DOM via `page.evaluate()`.

Data extracted per message:
- `external_id`: class matching `/^message-(\d+)$/`, or content hash fallback
- `sender_name`: `.nome-usuario .text`
- `sender_photo_url`: `.message-user-image` `src`, normalized
- `sender_type`: `'system'` if class contains `sistema`, else `'client'`
- `content`: `.message-text`
- `has_files`: `.message-file-link` exists with non-empty `href` and container not `.empty`
- `sent_at`: `.datetime-full` `cp-datetime` parsed as ms timestamp
- `sent_by_me`: message photo URL matches logged-in user photo URL
- `is_read`: `true`

### Frontend Polling (`frontend/src/pages/Messages.tsx`)
- Conversations sync every 30 seconds via `useEffect` interval
- Selected conversation messages sync every 15 seconds
- Manual sync buttons remain available
- Last sync timestamp displayed in UI
