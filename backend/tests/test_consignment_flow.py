from tests.conftest import client, db, as_customer, as_staff, as_admin  # noqa: F401


def _seed_request(db, rid="ar1", intent="consignment", status="submitted"):
    db.seed("authentication_requests", [{
        "id": rid, "status": status, "acquisition_intent": intent,
        "model": "Gucci Ace", "description": "Sneakers", "condition": "New",
        "category_id": "c2", "brand_id": "br1", "preferred_branch_id": "b1",
        "customer_id": "u-customer", "submitted_at": "2026-02-01T00:00:00Z",
    }])
    db.seed("request_documents", [{
        "request_id": rid, "document_type": "image", "file_url": "/uploads/gucci.jpg",
    }])


def test_customer_cannot_schedule_physical_auth(client, db, as_customer):
    _seed_request(db)
    resp = client.post(
        "/api/v1/consignments/ar1/physical-authentication",
        json={"branch_id": "b1", "appointment_at": "2026-03-01T10:00:00Z"},
    )
    assert resp.status_code == 403


def test_staff_schedules_physical_auth(client, db, as_staff):
    _seed_request(db)
    resp = client.post(
        "/api/v1/consignments/ar1/physical-authentication",
        json={"branch_id": "b2", "appointment_at": "2026-03-01T10:00:00Z", "notes": "Bring papers"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["request_id"] == "ar1"
    assert body["branch_id"] == "b2"
    assert body["staff_id"] == "u-staff"


def test_staff_schedules_without_branch_falls_back_to_preferred(client, db, as_staff):
    _seed_request(db)
    resp = client.post(
        "/api/v1/consignments/ar1/physical-authentication",
        json={"appointment_at": "2026-03-01T10:00:00Z"},
    )
    assert resp.status_code == 200
    assert resp.json()["branch_id"] == "b1"  # preferred_branch_id on the request


def test_decision_requires_selling_price_for_approval(client, db, as_staff):
    _seed_request(db)
    client.post("/api/v1/consignments/ar1/physical-authentication", json={"branch_id": "b1"})
    pa_id = db._rows["physical_authentications"][-1]["id"]
    resp = client.patch(
        f"/api/v1/consignments/physical-authentication/{pa_id}",
        json={"result": "authenticated"},
    )
    assert resp.status_code == 422


def test_shop_buy_decision_requires_payout_amount(client, db, as_staff):
    _seed_request(db, intent="shop_buy")
    client.post("/api/v1/consignments/ar1/physical-authentication", json={"branch_id": "b1"})
    pa_id = db._rows["physical_authentications"][-1]["id"]
    resp = client.patch(
        f"/api/v1/consignments/physical-authentication/{pa_id}",
        json={"result": "authenticated", "selling_price": 500.0},
    )
    assert resp.status_code == 422


def test_consignment_decision_promotes_item(client, db, as_staff):
    _seed_request(db, intent="consignment")
    client.post("/api/v1/consignments/ar1/physical-authentication", json={"branch_id": "b1"})
    pa_id = db._rows["physical_authentications"][-1]["id"]
    resp = client.patch(
        f"/api/v1/consignments/physical-authentication/{pa_id}",
        json={"result": "authenticated", "selling_price": 500.0, "commission_pct": 15.0, "notes": "Great condition"},
    )
    assert resp.status_code == 200

    item = next(i for i in db._rows["items"] if i.get("source_request_id") == "ar1")
    assert item["ownership_type"] == "consigned"
    assert item["status"] == "available"
    assert item["selling_price"] == 500.0
    assert item["branch_id"] == "b1"
    acq = next(a for a in db._rows["acquisitions"] if a["request_id"] == "ar1")
    assert acq["acquisition_type"] == "consignment"
    assert acq["commission_pct"] == 15.0


def test_shop_buy_decision_creates_store_owned_item(client, db, as_staff):
    _seed_request(db, intent="shop_buy")
    client.post("/api/v1/consignments/ar1/physical-authentication", json={"branch_id": "b1"})
    pa_id = db._rows["physical_authentications"][-1]["id"]
    resp = client.patch(
        f"/api/v1/consignments/physical-authentication/{pa_id}",
        json={"result": "authenticated", "selling_price": 500.0, "payout_amount": 400.0},
    )
    assert resp.status_code == 200

    item = next(i for i in db._rows["items"] if i.get("source_request_id") == "ar1")
    assert item["ownership_type"] == "store_owned"

    acq = next(a for a in db._rows["acquisitions"] if a["request_id"] == "ar1")
    assert acq["acquisition_type"] == "shop_buy"
    assert acq["payout_amount"] == 400.0


def test_rejection_does_not_create_item(client, db, as_staff):
    _seed_request(db)
    client.post("/api/v1/consignments/ar1/physical-authentication", json={"branch_id": "b1"})
    pa_id = db._rows["physical_authentications"][-1]["id"]
    resp = client.patch(
        f"/api/v1/consignments/physical-authentication/{pa_id}",
        json={"result": "rejected", "notes": "Unable to verify"},
    )
    assert resp.status_code == 200
    assert not any(i.get("source_request_id") == "ar1" for i in db._rows["items"])


def test_promote_is_idempotent(client, db, as_staff):
    """A request can only be promoted once — a second promote returns the same item."""
    from app.services.consignment_service.promotion import promote_approved_consignment

    _seed_request(db)
    client.post("/api/v1/consignments/ar1/physical-authentication", json={"branch_id": "b1"})
    client.patch(
        f"/api/v1/consignments/physical-authentication/{db._rows['physical_authentications'][-1]['id']}",
        json={"result": "authenticated", "selling_price": 500.0},
    )

    first = next(i for i in db._rows["items"] if i.get("source_request_id") == "ar1")
    # Background task already promoted it. Promote again directly -> same item id, no dup.
    again = promote_approved_consignment(db, "ar1", "b1", 500.0)
    assert again["id"] == first["id"]
    matches = [i for i in db._rows["items"] if i.get("source_request_id") == "ar1"]
    assert len(matches) == 1
    acqs = [a for a in db._rows["acquisitions"] if a["request_id"] == "ar1"]
    assert len(acqs) == 1


def test_customer_cannot_finalize_decision(client, db, as_customer):
    _seed_request(db)
    resp = client.patch(
        "/api/v1/consignments/physical-authentication/whatever",
        json={"result": "rejected"},
    )
    assert resp.status_code == 403


def test_staff_queue_filters_by_status(client, db, as_admin):
    _seed_request(db, rid="ar1", status="submitted")
    _seed_request(db, rid="ar2", status="approved")
    resp = client.get("/api/v1/staff/consignments", params={"status": "approved"})
    assert resp.status_code == 200
    ids = [row["request_id"] for row in resp.json()]
    assert "ar2" in ids
    assert "ar1" not in ids


def test_deactivated_staff_account_is_rejected(client, db, as_staff):
    u = next(u for u in db._rows["users"] if u["id"] == "u-staff")
    u["is_active"] = False
    resp = client.get("/api/v1/reports/dashboard")
    assert resp.status_code == 403
    assert "deactivated" in resp.json()["detail"]


def test_customer_endpoints_require_staff_context(client, db, as_customer):
    resp = client.get("/api/v1/reports/dashboard")
    assert resp.status_code == 403


def test_staff_cannot_use_admin_only_endpoints(client, db, as_staff):
    resp = client.get("/api/v1/auth/admin/users")
    assert resp.status_code == 403