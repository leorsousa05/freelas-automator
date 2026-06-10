from uuid import uuid4
from app.schemas import AccountCreate, ProjectOut


def test_account_create_valid():
    a = AccountCreate(username="joao", password="secret")
    assert a.username == "joao"


def test_project_out_serialization():
    data = {
        "id": uuid4(),
        "account_id": uuid4(),
        "external_id": "123",
        "title": "Test",
        "description": None,
        "budget_min": None,
        "budget_max": None,
        "deadline": None,
        "url": None,
        "category": None,
        "skills": [],
        "scraped_at": "2026-06-08T10:00:00",
        "is_new": True,
        "subcategory": None,
        "experience_level": None,
        "proposals_count": None,
        "interested_count": None,
        "client_name": None,
        "cached_at": None,
    }
    p = ProjectOut.model_validate(data)
    assert p.title == "Test"
