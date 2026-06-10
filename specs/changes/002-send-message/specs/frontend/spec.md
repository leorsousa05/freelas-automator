# Frontend Delta

## MODIFIED: `frontend/src/pages/Messages.tsx`

Add composer bar at the bottom of the middle column (message thread):
- Fixed textarea with placeholder "Escreva sua mensagem..."
- Send button labeled "Enviar"
- Disabled state while sending
- Show error inline if send fails
- After successful send:
  - Clear textarea
  - Trigger immediate message sync (refetch)

## MODIFIED: `frontend/src/api.ts`

Add:
```ts
conversations.send: (id: string, text: string) => Promise<{ success: boolean; ... }>
```
