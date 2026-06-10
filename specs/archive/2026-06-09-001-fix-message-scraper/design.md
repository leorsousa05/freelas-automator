# Design

## Flow: scrape_conversations

```
page.goto(/messages, domcontentloaded)
sleep(2)
click(.directory-inbox)
wait_for_selector(.conversa-item.clone, timeout=8s)
sleep(2)

# Try JSON extraction first
html = page.content()
data = extract_novas_mensagens(html)
if data and len(data) > 0:
    return parse_from_json(data)

# DOM extraction via JS evaluate
items = page.evaluate(() => {
    // querySelectorAll + filter out .model
    // normalize photo URL
    // check computed style for verified badge
    // extract cp-datetime
})
return items
```

## Flow: scrape_conversation_messages

```
page.goto(/messages/inbox/{id}, domcontentloaded)
sleep(3)
wait_for_selector(.message-item:not(.clone):not(.model), timeout=8s)

messages = page.evaluate(() => {
    // get logged-in user photo from .info-url-foto-pessoa
    // querySelectorAll .message-item, filter .clone/.model
    // match /^message-(\d+)$/ for ID
    // detect sent_by_me via photo comparison
    // normalize photo URL
})
return messages
```

## Frontend Polling

- Component mount → start 30s interval for conversations
- Selected conversation change → start 15s interval for messages
- Component unmount / conversation deselect → clear intervals
- Manual sync button still available (triggers immediate sync)
