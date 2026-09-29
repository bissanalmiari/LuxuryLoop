from tests.conftest import client, db, as_customer, as_staff  # noqa: F401


def _add_to_cart(client, item_id: str) -> None:
    resp = client.post("/api/v1/cart", json={"item_id": item_id})
    assert resp.status_code == 201, resp.text


def test_checkout_empty_cart_is_400(client, as_customer):
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"fulfillment_type": "pickup", "pickup_branch_id": "b2", "payment_method": "card", "address": None},
    )
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"]


def test_checkout_unavailable_item_is_400(client, db, as_customer):
    """A reserved/sold item in the cart must surface ITEM_UNAVAILABLE as a 400."""
    db.seed("items", [{
        "id": "i-sold", "item_code": "LL-003", "category_id": "c1", "brand_id": "br1",
        "branch_id": "b1", "title": "Vintage Omega", "model": "Speedmaster", "description": "Moonwatch",
        "condition": "Good", "ownership_type": "store_owned", "cost": 3000, "selling_price": 4500,
        "discount": 0, "status": "sold", "created_at": "2026-01-01T00:00:00Z",
    }])
    db.seed("cart_items", [{"customer_id": "u-customer", "item_id": "i-sold"}])
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"fulfillment_type": "pickup", "pickup_branch_id": "b2", "payment_method": "card", "address": None},
    )
    assert resp.status_code == 400
    assert "no longer available" in resp.json()["detail"]


def test_checkout_requires_complete_delivery_address(client, db, as_customer):
    _add_to_cart(client, "i1")
    resp = client.post(
        "/api/v1/orders/checkout",
        json={
            "fulfillment_type": "delivery",
            "payment_method": "card",
            "address": {"full_name": "Jane", "phone": "+961 3 111 111", "address_line1": "", "city": ""},
        },
    )
    assert resp.status_code == 400
    assert "Shipping address is incomplete" in resp.json()["detail"]


def test_checkout_non_customer_is_403(client, as_staff):
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"fulfillment_type": "pickup", "pickup_branch_id": "b2", "payment_method": "card", "address": None},
    )
    assert resp.status_code == 403
    assert "Only customers can checkout" in resp.json()["detail"]


def test_cancel_checkout_restores_cart_items(client, db, as_customer):
    _add_to_cart(client, "i1")
    checkout = client.post(
        "/api/v1/orders/checkout",
        json={"fulfillment_type": "pickup", "pickup_branch_id": "b2", "payment_method": "card", "address": None},
    )
    assert checkout.status_code == 200
    order_ids = checkout.json()["order_ids"]

    # While pending, the item is reserved and no longer in the cart.
    item = next(i for i in db._rows["items"] if i["id"] == "i1")
    assert item["status"] == "reserved"

    resp = client.post("/api/v1/orders/cancel-checkout", json={"order_ids": order_ids})
    assert resp.status_code == 204

    item = next(i for i in db._rows["items"] if i["id"] == "i1")
    assert item["status"] == "available"
    cart = client.get("/api/v1/cart").json()["items"]
    assert any(c["item_id"] == "i1" for c in cart)


def test_cancel_checkout_only_touches_own_pending_orders(client, db, as_customer):
    """Cancelling an id that isn't yours or isn't pending is a safe no-op."""
    db.seed("orders", [{
        "id": "ord-other", "customer_id": "someone-else", "branch_id": "b1",
        "status": "paid", "channel": "online", "fulfillment_type": "pickup",
        "total_amount": 500.0, "created_at": "2026-01-01T00:00:00Z",
    }])
    resp = client.post("/api/v1/orders/cancel-checkout", json={"order_ids": ["ord-other"]})
    assert resp.status_code == 204
    assert any(o["id"] == "ord-other" for o in db._rows["orders"])


def test_list_orders_requires_staff(client, as_customer):
    resp = client.get("/api/v1/orders")
    assert resp.status_code == 403


def test_my_orders_show_only_own_orders(client, db, as_customer):
    _add_to_cart(client, "i1")
    checkout = client.post(
        "/api/v1/orders/checkout",
        json={"fulfillment_type": "pickup", "pickup_branch_id": "b2", "payment_method": "card", "address": None},
    ).json()
    confirm = client.post("/api/v1/orders/confirm-payment", json={"checkout_session_id": checkout["checkout_session_id"]}).json()
    assert confirm["order_ids"]

    db.seed("orders", [{
        "id": "ord-foreign", "customer_id": "u-admin", "branch_id": "b1",
        "status": "paid", "channel": "online", "fulfillment_type": "pickup",
        "total_amount": 999.0, "created_at": "2026-01-01T00:00:00Z",
    }])

    resp = client.get("/api/v1/orders/me")
    assert resp.status_code == 200
    ids = [o["id"] for o in resp.json()["orders"]]
    assert confirm["order_ids"][0] in ids
    assert "ord-foreign" not in ids