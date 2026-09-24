from tests.conftest import client, db, as_customer, as_admin  # noqa: F401


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_products_list_returns_seeded_items(client):
    resp = client.get("/api/v1/products", params={"page": 1, "page_size": 10, "status": "available"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    assert all(item["status"] == "available" for item in body["items"])


def test_products_filter_by_category(client):
    resp = client.get("/api/v1/products", params={"category_id": "c1", "status": "available"})
    assert resp.status_code == 200
    for item in resp.json()["items"]:
        assert item["category_name"] == "Watches"


def test_product_detail(client):
    resp = client.get("/api/v1/products/i1")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Rolex Submariner"
    assert resp.json()["brand_name"] == "Rolex"


def test_product_detail_404(client):
    resp = client.get("/api/v1/products/nope")
    assert resp.status_code == 404


def test_reference_data_endpoints(client):
    assert client.get("/api/v1/branches").status_code == 200
    assert client.get("/api/v1/categories").status_code == 200
    assert client.get("/api/v1/brands").status_code == 200


def test_newsletter_subscribe_and_duplicate(client, db):
    payload = {"email": "join@example.com", "source": "footer"}
    first = client.post("/api/v1/newsletter/subscribe", json=payload)
    assert first.status_code == 201
    assert first.json()["email"] == "join@example.com"

    # Duplicate email must not error (upsert / ignore duplicates).
    dup = client.post("/api/v1/newsletter/subscribe", json=payload)
    assert dup.status_code == 201

    rows = db._rows.get("newsletter_subscribers", [])
    assert len([r for r in rows if r["email"] == "join@example.com"]) == 1


def test_newsletter_subscribe_invalid_email(client):
    resp = client.post("/api/v1/newsletter/subscribe", json={"email": "not-an-email"})
    assert resp.status_code == 422


def test_newsletter_subscribers_requires_staff(client, as_customer):
    resp = client.get("/api/v1/newsletter/subscribers")
    assert resp.status_code == 403


def test_newsletter_subscribers_as_admin(client, as_admin):
    resp = client.get("/api/v1/newsletter/subscribers")
    assert resp.status_code == 200
    assert "subscribers" in resp.json()