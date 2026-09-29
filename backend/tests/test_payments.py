import pytest

from app.core.config import settings
from app.services import order_service
from tests.conftest import _FakeStripe, client, db, as_customer  # noqa: F401


def _checkout(client):
    client.post("/api/v1/cart", json={"item_id": "i1"})
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"fulfillment_type": "pickup", "pickup_branch_id": "b2", "payment_method": "card", "address": None},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_duplicate_confirmations_are_idempotent(client, db, as_customer):
    body = _checkout(client)
    first = client.post("/api/v1/orders/confirm-payment", json={"checkout_session_id": body["checkout_session_id"]})
    assert first.status_code == 200
    assert first.json()["order_ids"] == body["order_ids"]

    second = client.post("/api/v1/orders/confirm-payment", json={"checkout_session_id": body["checkout_session_id"]})
    assert second.status_code == 200
    # Same order ids back, no duplicate order, no duplicate payment rows.
    assert second.json()["order_ids"] == body["order_ids"]

    orders = db._rows["orders"]
    mine = [o for o in orders if o["id"] in body["order_ids"]]
    assert len(mine) == len(body["order_ids"])
    assert all(o["status"] == "paid" for o in mine)
    for oid in body["order_ids"]:
        payments_for_order = [p for p in db._rows["payments"] if p["order_id"] == oid]
        assert len(payments_for_order) == 1
        assert payments_for_order[0]["status"] == "succeeded"


def test_failed_payment_returns_402_and_keeps_order_pending(client, db, as_customer):
    body = _checkout(client)
    _FakeStripe.set_payment_status(body["checkout_session_id"], "unpaid")

    resp = client.post("/api/v1/orders/confirm-payment", json={"checkout_session_id": body["checkout_session_id"]})
    assert resp.status_code == 402
    assert "Payment not confirmed" in resp.json()["detail"]

    order = next(o for o in db._rows["orders"] if o["id"] == body["order_ids"][0])
    assert order["status"] == "pending"


def test_repeated_confirmations_cannot_backdate_paid_orders(client, db, as_customer):
    """Once confirmed paid, a repeat cannot flip the order back to pending."""
    body = _checkout(client)
    first = client.post("/api/v1/orders/confirm-payment", json={"checkout_session_id": body["checkout_session_id"]})
    assert first.status_code == 200

    # Simulate a very slow/replayed callback: payment already succeeded on Stripe.
    order = next(o for o in db._rows["orders"] if o["id"] == body["order_ids"][0])
    assert order["status"] == "paid"

    repeat = client.post("/api/v1/orders/confirm-payment", json={"checkout_session_id": body["checkout_session_id"]})
    assert repeat.status_code == 200
    assert repeat.json()["order_ids"] == body["order_ids"]
    order = next(o for o in db._rows["orders"] if o["id"] == body["order_ids"][0])
    assert order["status"] == "paid"


def test_confirm_unknown_session_is_402(client, as_customer):
    resp = client.post("/api/v1/orders/confirm-payment", json={"checkout_session_id": "cs_test_unknown"})
    assert resp.status_code == 402


def test_stripe_misconfigured_is_503_and_cancels_orders(client, db, as_customer, monkeypatch):
    monkeypatch.setattr(settings, "stripe_secret_key", "")
    client.post("/api/v1/cart", json={"item_id": "i1"})
    resp = client.post(
        "/api/v1/orders/checkout",
        json={"fulfillment_type": "pickup", "pickup_branch_id": "b2", "payment_method": "card", "address": None},
    )
    assert resp.status_code == 503
    assert "Stripe is not configured" in resp.json()["detail"]

    # The pending order was cancelled and the item returned to the cart.
    mine = [o for o in db._rows["orders"] if o["customer_id"] == "u-customer" and o["branch_id"] == "b1"]
    assert not any(o["status"] == "pending" for o in mine)
    item = next(i for i in db._rows["items"] if i["id"] == "i1")
    assert item["status"] == "available"
    cart = client.get("/api/v1/cart").json()["items"]
    assert any(c["item_id"] == "i1" for c in cart)


def test_mark_payments_succeeded_directly_is_idempotent(client, db, as_customer, monkeypatch):
    body = _checkout(client)
    _FakeStripe.set_payment_status(body["checkout_session_id"], "paid")

    import app.services.payment_service as ps
    monkeypatch.setattr(ps, "stripe", _FakeStripe._instance)

    order_ids, newly_paid = order_service.mark_payments_succeeded(db, body["checkout_session_id"])
    assert order_ids == body["order_ids"]
    assert newly_paid == body["order_ids"]

    # Repeated call: same order ids, but nothing marked newly paid (no re-emails).
    order_ids2, newly_paid2 = order_service.mark_payments_succeeded(db, body["checkout_session_id"])
    assert order_ids2 == body["order_ids"]
    assert newly_paid2 == []


def test_confirm_payment_requires_auth(client, as_customer):
    body = _checkout(client)
    app = client.app
    from app.core.security import get_current_user
    from fastapi import HTTPException

    def _raise_401():
        raise HTTPException(status_code=401, detail="Missing bearer token")

    app.dependency_overrides[get_current_user] = lambda: _raise_401()
    resp = client.post("/api/v1/orders/confirm-payment", json={"checkout_session_id": body["checkout_session_id"]})
    assert resp.status_code == 401