import asyncio
import hashlib
import json
import logging
import re
import urllib.parse
from datetime import datetime
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _parse_timestamp_ms(value: str | None) -> datetime | None:
    """Parse a timestamp in milliseconds, e.g. '1781021154000'."""
    if not value:
        return None
    try:
        return datetime.fromtimestamp(int(value) / 1000)
    except Exception:
        return None


def _extract_novas_mensagens(html: str) -> list | None:
    """Try multiple formats to extract the conversation JSON from HTML."""
    match = re.search(r"var\s+novasMensagens\s*=\s*(\[.*?\]);", html, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    match = re.search(
        r"NineNineFreelas\.infoUsuario\.novasMensagens\s*=\s*JSON\.parse\(decodeURIComponent\(['\"](.+?)['\"]\)\)",
        html,
        re.DOTALL,
    )
    if match:
        try:
            decoded = urllib.parse.unquote(match.group(1))
            return json.loads(decoded)
        except (json.JSONDecodeError, ValueError):
            pass

    return None


def _normalize_photo_url(url: str | None) -> str | None:
    if not url:
        return None
    url = url.strip()
    if url.startswith("http"):
        return url
    return f"https://duqxk0v9olda1.cloudfront.net/profile/66x66/{url}"


async def scrape_conversations(page) -> list[dict]:
    """Scrape conversation list from /messages."""
    logger.info("[SCRAPE-CONVERSATIONS] Navigating to /messages")
    await page.goto("https://www.99freelas.com.br/messages", wait_until="domcontentloaded")
    await asyncio.sleep(2)

    # Trigger and wait for conversation list to render
    try:
        await page.wait_for_selector(".directory-inbox", state="visible", timeout=5000)
        await page.click(".directory-inbox")
        await page.wait_for_selector(".conversa-item.clone", state="visible", timeout=8000)
        await asyncio.sleep(1)
    except Exception as exc:
        logger.warning("[SCRAPE-CONVERSATIONS] Could not trigger conversation load: %s", exc)

    # Extract from rendered DOM first (more reliable for active sessions)
    dom_items = await page.evaluate("""() => {
        return Array.from(document.querySelectorAll('.conversa-item'))
            .filter(item => !item.classList.contains('model'))
            .map(item => {
                const img = item.querySelector('.conversa-item-img');
                let rawPhoto = img?.getAttribute('data-src') || img?.getAttribute('src') || '';
                const identity = item.querySelector('.icon-identity');
                return {
                    external_id: item.getAttribute('data-id') || '',
                    project_name: item.querySelector('.project-name')?.textContent?.trim() || null,
                    client_name: item.querySelector('.pessoa-name')?.textContent?.trim() || null,
                    raw_photo_url: rawPhoto,
                    snippet: item.querySelector('.item-description .text')?.textContent?.trim() || null,
                    datetime: item.querySelector('.dh-envio')?.getAttribute('cp-datetime') || null,
                    has_identity: !!identity,
                    identity_display: identity ? window.getComputedStyle(identity).display : 'none',
                    is_unread: !item.classList.contains('visualizada'),
                };
            })
            .filter(item => item.external_id);
    }""")

    conversations = []
    for item in dom_items:
        photo = _normalize_photo_url(item.get("raw_photo_url"))
        verified = item.get("has_identity", False) and item.get("identity_display") != "none"
        conversations.append({
            "external_id": str(item["external_id"]),
            "client_name": item.get("client_name"),
            "client_photo_url": photo,
            "client_verified": verified,
            "project_id": None,
            "project_name": item.get("project_name"),
            "last_message_snippet": item.get("snippet"),
            "last_message_at": _parse_timestamp_ms(item.get("datetime")),
            "has_files": False,
            "is_deleted": False,
            "is_system": False,
            "is_admin": False,
            "unread": item.get("is_unread", False),
        })

    if conversations:
        logger.info("[SCRAPE-CONVERSATIONS] Parsed %d conversations from DOM", len(conversations))
        return conversations

    # Fallback: embedded JSON
    html = await page.content()
    data = _extract_novas_mensagens(html)
    if data is not None and len(data) > 0:
        json_conversations = []
        for item in data:
            json_conversations.append({
                "external_id": str(item.get("idConversa", "")),
                "client_name": item.get("nomeRemetente") or None,
                "client_photo_url": _normalize_photo_url(item.get("urlFotoRemetente")),
                "client_verified": bool(item.get("identidadeVerificada", False)),
                "project_id": str(item.get("idProjeto", "")) or None,
                "project_name": item.get("nomeProjeto") or None,
                "last_message_snippet": item.get("descricaoCurta") or None,
                "last_message_at": _parse_iso_datetime(item.get("dhEnvio")),
                "has_files": bool(item.get("temArquivos", False)),
                "is_deleted": bool(item.get("excluida", False)),
                "is_system": bool(item.get("sistema", False)),
                "is_admin": bool(item.get("admin", False)),
                "unread": not bool(item.get("visualizada", True)),
            })
        logger.info("[SCRAPE-CONVERSATIONS] Parsed %d conversations from JSON fallback", len(json_conversations))
        return json_conversations

    logger.warning("[SCRAPE-CONVERSATIONS] No conversations found in DOM or JSON")
    return []


async def scrape_conversation_messages(page, conversation_external_id: str) -> list[dict]:
    """Scrape messages from a conversation detail page."""
    url = f"https://www.99freelas.com.br/messages/inbox/{conversation_external_id}"
    logger.info("[SCRAPE-CONV-MESSAGES] Navigating to %s", url)
    await page.goto(url, wait_until="domcontentloaded")
    await asyncio.sleep(3)

    try:
        await page.wait_for_selector(".message-item:not(.clone):not(.model)", state="visible", timeout=8000)
    except Exception as exc:
        logger.warning("[SCRAPE-CONV-MESSAGES] No messages rendered: %s", exc)

    messages = await page.evaluate("""() => {
        const userPhotoInput = document.querySelector('.info-geral-pessoa .info-url-foto-pessoa');
        const userPhoto = userPhotoInput?.value || '';
        const fullUserPhoto = userPhoto.startsWith('http')
            ? userPhoto
            : userPhoto ? 'https://duqxk0v9olda1.cloudfront.net/profile/66x66/' + userPhoto : '';

        return Array.from(document.querySelectorAll('.message-item'))
            .filter(item => !item.classList.contains('clone') && !item.classList.contains('model'))
            .map(item => {
                const photoEl = item.querySelector('.message-user-image');
                const rawPhoto = photoEl?.getAttribute('src') || '';
                const isSystem = item.classList.contains('sistema');
                const sentByMe = !!rawPhoto && !!fullUserPhoto && rawPhoto === fullUserPhoto;

                let msgId = '';
                const classes = Array.from(item.classList);
                for (let i = 0; i < classes.length; i++) {
                    const match = classes[i].match(/^message-(\\d+)$/);
                    if (match) {
                        msgId = match[1];
                        break;
                    }
                }

                const datetime = item.querySelector('.datetime-full')?.getAttribute('cp-datetime') || '';
                const content = item.querySelector('.message-text')?.textContent?.trim() || '';
                const name = item.querySelector('.nome-usuario .text')?.textContent?.trim() || '';

                if (!msgId) {
                    const hash = btoa(unescape(encodeURIComponent(name + '|' + datetime + '|' + content.slice(0, 50))));
                    msgId = 'msg_' + hash.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
                }

                const fileContainer = item.querySelector('.message-file-link-container');
                const fileLink = item.querySelector('.message-file-link');
                const hasFiles = !!fileLink && !fileContainer?.classList.contains('empty') && !!fileLink.getAttribute('href');

                return {
                    external_id: msgId,
                    sender_name: name,
                    raw_photo_url: rawPhoto,
                    sender_type: isSystem ? 'system' : 'client',
                    content: content,
                    has_files: hasFiles,
                    sent_at: datetime,
                    sent_by_me: sentByMe,
                    is_read: true,
                };
            });
    }""")

    parsed = []
    for m in messages:
        parsed.append({
            "external_id": m.get("external_id", ""),
            "sender_name": m.get("sender_name") or None,
            "sender_photo_url": _normalize_photo_url(m.get("raw_photo_url")),
            "sender_type": m.get("sender_type", "client"),
            "content": m.get("content") or None,
            "has_files": m.get("has_files", False),
            "sent_at": _parse_timestamp_ms(m.get("sent_at")),
            "sent_by_me": m.get("sent_by_me", False),
            "is_read": m.get("is_read", True),
        })

    logger.info("[SCRAPE-CONV-MESSAGES] Parsed %d messages", len(parsed))
    return parsed


async def send_message(page, conversation_external_id: str, text: str) -> dict:
    """Send a text message to a conversation via 99freelas."""
    logger.info("[SEND-MESSAGE] Sending to conversation %s", conversation_external_id)

    payload = {
        "idConversa": int(conversation_external_id),
        "texto": text,
        "idsArquivos": [],
    }
    encoded = urllib.parse.quote(json.dumps(payload), safe="")
    body = f"data={encoded}"

    response = await page.request.fetch(
        "https://www.99freelas.com.br/services/user/enviarMensagemConversa",
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "https://www.99freelas.com.br",
            "Referer": "https://www.99freelas.com.br/messages",
        },
        data=body,
    )
    response_text = await response.text()

    logger.info("[SEND-MESSAGE] Response: %s", response_text[:500])

    # 99freelas sometimes returns URL-encoded JSON
    decoded_text = urllib.parse.unquote(response_text)
    if decoded_text != response_text:
        logger.info("[SEND-MESSAGE] Decoded response: %s", decoded_text[:500])

    try:
        response_data = json.loads(decoded_text)
    except json.JSONDecodeError:
        response_data = {"raw": decoded_text}

    status = response_data.get("status", {})
    status_id = status.get("id") if isinstance(status, dict) else None

    if status_id != 1:
        raise Exception(f"99freelas send failed: status={status_id}, response={response_text[:500]}")

    return {
        "success": True,
        "external_id": conversation_external_id,
        "text": text,
        "sent_at": datetime.utcnow(),
        "response": response_data,
    }
