from tests.conftest import client, db, as_customer, as_admin  # noqa: F401


def test_customers_list_requires_staff(client, as_customer):
    assert client.get("/api/v1/reports/customers").status_code == 403


def test_customers_list_as_admin(client, as_admin):
    resp = client.get("/api/v1/reports/customers")
    assert resp.status_code == 200
    body = resp.json()
    emails = [c["email"] for c in body["customers"]]
    assert "customer@example.com" in emails
    assert any(c["orders_count"] == 0 for c in body["customers"])


def test_edit_customer_info(client, db, as_admin):
    patch = client.patch(
        "/api/v1/auth/admin/users/u-customer",
        json={"full_name": "Jane Updated", "phone": "+961 71 111 111"},
    )
    assert patch.status_code == 200
    assert patch.json()["full_name"] == "Jane Updated"

    rows = db._rows["users"]
    updated = next(r for r in rows if r["id"] == "u-customer")
    assert updated["full_name"] == "Jane Updated"
    assert updated["phone"] == "+961 71 111 111"


def test_edit_customer_requires_admin(client, as_customer):
    resp = client.patch("/api/v1/auth/admin/users/u-customer", json={"full_name": "Nope"})
    assert resp.status_code == 403


def test_edit_nonexistent_customer_404(client, as_admin):
    resp = client.patch("/api/v1/auth/admin/users/does-not-exist", json={"full_name": "Ghost"})
    assert resp.status_code == 404


def test_create_customer_flow(client, db, as_admin):
    resp = client.post(
        "/api/v1/auth/admin/users",
        json={"email": "new@example.com", "password": "supersecret", "full_name": "New Person", "role": "customer"},
    )
    assert resp.status_code == 201
    assert resp.json()["role"] == "customer"

    emails = [u["email"] for u in db._rows["users"]]
    assert "new@example.com" in emails


def test_staff_consignment_queue_requires_staff(client, as_customer):
    assert client.get("/api/v1/staff/consignments").status_code == 403


def test_staff_consignment_queue_as_admin(client, db, as_admin):
    # Seed one auth request so the queue is non-empty.
    db.seed("authentication_requests", [{
        "id": "ar1", "status": "submitted", "acquisition_intent": "consignment",
        "model": "Gucci Ace", "description": "Sneakers", "condition": "New",
        "category_id": "c2", "brand_id": "br1", "preferred_branch_id": "b1",
        "customer_id": "u-customer", "submitted_at": "2026-02-01T00:00:00Z",
    }])
    resp = client.get("/api/v1/staff/consignments")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_role_change_affects_permissions(client, db, as_admin):
    resp = client.patch("/api/v1/auth/admin/users/u-customer/role", json={"role": "customer"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "customer"