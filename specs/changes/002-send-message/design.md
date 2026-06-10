# Design

## Backend Flow

```
POST /api/conversations/{conversation_id}/send
  ↓
Lookup conversation → get external_id + account_id
  ↓
with_authenticated_page(account_id)
  ↓
send_message(page, external_id, text)
  ↓
POST https://www.99freelas.com.br/services/user/enviarMensagemConversa
Body: data=%7B%22idConversa%22%3A16671948%2C%22texto%22%3A%22...%22%2C%22idsArquivos%22%3A%5B%5D%7D
  ↓
Parse response and return to frontend
```

## Frontend Flow

```
User types in textarea
  ↓
Clicks "Enviar" or presses Enter
  ↓
api.conversations.send(selectedId, text)
  ↓
On success: clear input + refetch messages
On error: show inline error
```

## 99freelas Response Format

Based on site patterns, expected response is JSON text with status wrapper:
```json
{"status": {"id": 1}, "result": {...}}
```
Status id === 1 indicates success.
