import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_create_and_list_accounts(client):
    username = f"testuser_{uuid.uuid4().hex[:8]}"
    response = client.post("/api/accounts", json={"username": username, "password": "pass123"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == username
    assert "password" not in data

    response = client.get("/api/accounts")
    assert response.status_code == 200
    assert len(response.json()) >= 1
