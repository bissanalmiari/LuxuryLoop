from tests.conftest import client, db, as_customer, as_admin, as_staff  # noqa: F401


def test_contact_submit_public(client):
    payload = {
        "name": "Ziad",
        "email": "ziad@example.com",
        "phone": "+961 3 999 999",
        "subject": "Question about a watch",
        "message": "Is the Rolex still available?",
    }
    resp = client.post("/api/v1/contact", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "new"
    assert body["email"] == "ziad@example.com"


def test_contact_submit_requires_name_and_message(client):
    resp = client.post("/api/v1/contact", json={"name": "", "email": "x@y.co", "message": "hi"})
    assert resp.status_code == 422
    resp = client.post("/api/v1/contact", json={"name": "Ziad", "email": "x@y.co", "message": ""})
    assert resp.status_code == 422


def test_contact_list_requires_staff(client, as_customer):
    assert client.get("/api/v1/contact").status_code == 403


def test_contact_inbox_and_status_flow(client, as_admin):
    client.post("/api/v1/contact", json={"name": "A", "email": "a@b.co", "message": "Hello there"})
    resp = client.get("/api/v1/contact")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    message_id = body["messages"][0]["id"]

    patch = client.patch(f"/api/v1/contact/{message_id}/status", json={"status": "in_progress"})
    assert patch.status_code == 200
    assert patch.json()["status"] == "in_progress"

    filtered = client.get("/api/v1/contact", params={"status": "resolved"})
    assert filtered.json()["total"] == 0

    bad = client.patch(f"/api/v1/contact/{message_id}/status", json={"status": "bogus"})
    assert bad.status_code == 422


def test_contact_public_without_token_has_no_user_link(client, db, as_customer):
    client.post("/api/v1/contact", json={"name": "Jane", "email": "customer@example.com", "message": "Hi team"})
    rows = db._rows.get("contact_messages", [])
    assert rows and rows[0]["user_id"] is None