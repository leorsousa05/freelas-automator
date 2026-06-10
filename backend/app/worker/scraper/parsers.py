import re
from decimal import Decimal


def parse_info_text(text: str) -> dict:
    """Parse the 'p.information' text from project list items."""
    result = {
        "category": "",
        "experience_level": "",
        "published_at": "",
        "time_remaining": "",
        "proposals_count": None,
        "interested_count": None,
    }
    if not text:
        return result
    parts = [re.sub(r"\s+", " ", p).strip() for p in text.split("|")]
    if parts:
        result["category"] = parts[0]
    for part in parts:
        if re.search(r"^(Iniciante|Intermediário|Especialista)$", part):
            result["experience_level"] = part
        m = re.search(r"Publicado:\s*(.+)", part)
        if m:
            result["published_at"] = m.group(1).strip()
        m = re.search(r"Tempo restante:\s*(.+)", part)
        if m:
            result["time_remaining"] = m.group(1).strip()
        m = re.search(r"Propostas:\s*(\d+)", part)
        if m:
            result["proposals_count"] = int(m.group(1))
        m = re.search(r"Interessados:\s*(\d+)", part)
        if m:
            result["interested_count"] = int(m.group(1))
    return result


def parse_budget(budget_text: str) -> tuple[Decimal | None, Decimal | None]:
    """Parse budget text like 'R$ 1.000,00 – R$ 5.000,00' or 'Aberto'."""
    if not budget_text or budget_text.lower() in ("aberto", "não informado"):
        return None, None
    numbers = re.findall(r"R\$\s*([\d.,]+)", budget_text)
    if len(numbers) >= 2:
        try:
            return parse_brl(numbers[0]), parse_brl(numbers[1])
        except Exception:
            pass
    elif len(numbers) == 1:
        try:
            val = parse_brl(numbers[0])
            return val, val
        except Exception:
            pass
    return None, None


def parse_brl(value: str) -> Decimal:
    """Convert Brazilian currency string to Decimal."""
    cleaned = value.replace(".", "").replace(",", ".").strip()
    return Decimal(cleaned)
