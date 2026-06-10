# Send Message Feature

## WHY

Users need to reply to conversations directly from the FreelaBot dashboard without switching to the 99freelas website. This completes the conversation workflow (list → read → reply).

## Scope

1. Backend endpoint to send a text message through the logged-in 99freelas account
2. Frontend composer UI (textarea + send button) in the conversation thread panel
3. After sending, refresh the message thread to show the new message

## Constraints

- Must use existing authenticated Playwright page via `with_authenticated_page()`
- Must send to 99freelas endpoint: `POST /services/user/enviarMensagemConversa`
- Payload format: `data=<url_encoded_json>` where JSON is `{"idConversa": int, "texto": string, "idsArquivos": []}`
- No file attachments in MVP (text only)
- Real send will be validated by the user manually after implementation
