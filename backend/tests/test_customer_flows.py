from tests.conftest import client, db, as_customer  # noqa: F401


def test_auth_me_returns_profile(client, as_customer):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "u-customer"
    assert body["email"] == "customer@example.com"
    assert body["full_name"] == "Jane Doe"


def test_auth_me_requires_token(client):
    app = client.app
    from app.core.security import get_current_user
    app.dependency_overrides[get_current_user] = lambda: _raise_401()
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def _raise_401():
    from fastapi import HTTPException
    raise HTTPException(status_code=401, detail="Missing bearer token")


def test_update_profile(client, db, as_customer):
    resp = client.patch("/api/v1/auth/me", json={"full_name": "Jane R. Doe", "phone": "+961 70 000 000"})
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Jane R. Doe"
    rows = db._rows["users"]
    updated = next(r for r in rows if r["id"] == "u-customer")
    assert updated["phone"] == "+961 70 000 000"


def test_consign_requires_photo(client, as_customer):
    resp = client.post(
        "/api/v1/consignments",
        json={
            "model": "Rolex Daytona",
            "description": "White dial",
            "condition": "Excellent",
            "category_id": "c1",
            "brand_id": "br1",
            "documents": [],
        },
    )
    assert resp.status_code == 422


def test_consign_flow(client, db, as_customer):
    resp = client.post(
        "/api/v1/consignments",
        json={
            "model": "Rolex Daytona",
            "description": "White dial",
            "condition": "Excellent",
            "category_id": "c1",
            "brand_id": "br1",
            "preferred_branch_id": "b1",
            "documents": [{"document_type": "image", "file_url": "/uploads/daytona.jpg"}],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "submitted"
    assert body["brand_name"] == "Rolex"
    assert body["preferred_branch_name"] == "Beirut Main"

    mine = client.get("/api/v1/consignments/me")
    assert mine.status_code == 200
    assert any(c["id"] == body["id"] for c in mine.json()["consignments"])


def test_cart_add_and_view(client, db, as_customer):
    add = client.post("/api/v1/cart", json={"item_id": "i1"})
    assert add.status_code == 201
    view = client.get("/api/v1/cart")
    assert view.status_code == 200
    body = view.json()
    assert any(item["item_id"] == "i1" for item in body["items"])
    assert body["subtotal"] > 0


def test_favorites_flow(client, db, as_customer):
    add = client.post("/api/v1/favorites", json={"item_id": "i1"})
    assert add.status_code == 201
    lst = client.get("/api/v1/favorites")
    assert lst.status_code == 200
    assert [f["item_id"] for f in lst.json()["favorites"]] == ["i1"]

    rm = client.delete("/api/v1/favorites/i1")
    assert rm.status_code == 204
    lst2 = client.get("/api/v1/favorites")
    assert lst2.json()["favorites"] == []


def test_my_orders_requires_auth(client):
    resp = client.get("/api/v1/orders/me")
    assert resp.status_code in (401, 403)


def test_checkout_requires_pickup_branch(client, db, as_customer):
    client.post("/api/v1/cart", json={"item_id": "i1"})
    resp = client.post("/api/v1/orders/checkout", json={"fulfillment_type": "pickup", "payment_method": "card"})
    assert resp.status_code == 400
    assert "Pickup branch" in resp.json()["detail"]


def test_checkout_and_confirm_payment(client, db, as_customer):
    client.post("/api/v1/cart", json={"item_id": "i1"})
    resp = client.post(
        "/api/v1/orders/checkout",
        json={
            "fulfillment_type": "pickup",
            "pickup_branch_id": "b2",
            "address": None,
            "payment_method": "card",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["order_ids"]) == 1
    assert body["checkout_url"]
    assert body["checkout_session_id"]
    assert body["total_amount"] > 0

    session_id = body["checkout_session_id"]
    confirm = client.post("/api/v1/orders/confirm-payment", json={"checkout_session_id": session_id})
    assert confirm.status_code == 200
    assert confirm.json()["order_ids"] == body["order_ids"]

    payments = db._rows["payments"]
    target = [p for p in payments if p["order_id"] == body["order_ids"][0]]
    assert target and target[0]["status"] == "succeeded"
    assert target[0]["stripe_payment_intent_id"] == session_id

    orders = db._rows["orders"]
    order = next(o for o in orders if o["id"] == body["order_ids"][0])
    assert order["pickup_branch_id"] == "b2"
    assert order["fulfillment_type"] == "pickup"
    assert order["status"] == "paid"

    mine = client.get("/api/v1/orders/me")
    assert mine.status_code == 200
    listed = next(o for o in mine.json()["orders"] if o["id"] == body["order_ids"][0])
    assert listed["pickup_branch_name"] == "Jounieh Branch"


def test_checkout_delivery_stores_address(client, db, as_customer):
    client.post("/api/v1/cart", json={"item_id": "i1"})
    resp = client.post(
        "/api/v1/orders/checkout",
        json={
            "fulfillment_type": "delivery",
            "payment_method": "card",
            "address": {"full_name": "Jane Doe", "phone": "+961 3 123 456", "address_line1": "Hamra St", "city": "Beirut"},
        },
    )
    assert resp.status_code == 200
    addresses = db._rows["addresses"]
    assert any(a["city"] == "Beirut" for a in addresses)

    confirm = client.post("/api/v1/orders/confirm-payment", json={"checkout_session_id": resp.json()["checkout_session_id"]})
    assert confirm.status_code == 200
    order = next(o for o in db._rows["orders"] if o["id"] in confirm.json()["order_ids"])
    assert order["pickup_branch_id"] is None