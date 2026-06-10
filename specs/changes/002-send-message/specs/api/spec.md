# API Delta

## ADDED: `POST /api/conversations/{conversation_id}/send`

Request body:
```json
{
  "text": "string (required, max 12000 chars)"
}
```

Response:
```json
{
  "success": true,
  "conversation_id": "uuid",
  "external_id": "16671948",
  "text": "mensagem enviada",
  "sent_at": "2026-06-09T..."
}
```

Errors:
- 404: conversation not found
- 400: text missing or empty
- 502/504: 99freelas send failed (returns their raw response/status)

## ADDED: `send_message(page, conversation_external_id, text)`

In `app/worker/scraper/messages.py`:
- Build payload: `{"idConversa": int(external_id), "texto": text, "idsArquivos": []}`
- Serialize to JSON, URL-encode
- POST to `https://www.99freelas.com.br/services/user/enviarMensagemConversa`
- Body: `data=<encoded_json>`
- Content-Type: `application/x-www-form-urlencoded`
- Return parsed JSON response or raise on failure
