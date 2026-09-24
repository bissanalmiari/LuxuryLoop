"""Stripe Checkout Session wrapper.

Customers must complete payment on Stripe's hosted checkout page. There is no
mock success path because it could mark an order paid without a real payment.
"""
from __future__ import annotations

import stripe

from app.core.config import settings


def create_checkout_session(
    amount_usd: float,
    order_ids: list[str],
    customer_id: str,
    success_url: str,
    cancel_url: str,
) -> tuple[str, str]:
    """Returns (checkout_session_id, checkout_page_url)."""
    if not settings.stripe_secret_key:
        raise RuntimeError("Stripe is not configured. Add STRIPE_SECRET_KEY to backend/.env before checkout.")

    stripe.api_key = settings.stripe_secret_key
    session = stripe.checkout.Session.create(
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(round(amount_usd * 100)),
                    "product_data": {"name": "LuxuryLoop order"},
                },
                "quantity": 1,
            }
        ],
        metadata={"customer_id": customer_id, "order_ids": ",".join(order_ids)},
    )
    return session.id, session.url


def checkout_session_paid(session_id: str) -> bool:
    """True when a Stripe Checkout Session has been fully paid."""
    if not settings.stripe_secret_key:
        return False
    stripe.api_key = settings.stripe_secret_key
    session = stripe.checkout.Session.retrieve(session_id)
    return session.payment_status == "paid"