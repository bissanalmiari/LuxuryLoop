import psycopg
import pytest
from fastapi import HTTPException

from app.services import inventory_service
from tests.conftest import client, db, as_admin, as_staff  # noqa: F401


class _FakeCursor:
    def __init__(self, one=None, all=None):
        self._one = one
        self._all = all if all is not None else []

    def fetchone(self):
        return self._one

    def fetchall(self):
        return self._all


class _FakeConn:
    """Scripted conn: each execute() pops the next item off `plan`.
    Plain values are returned as cursors; exception instances are raised."""

    def __init__(self, plan):
        self.plan = list(plan)

    def execute(self, sql, params=None):
        if not self.plan:
            raise AssertionError(f"No plan step left for sql: {sql}")
        step = self.plan.pop(0)
        if isinstance(step, Exception):
            raise step
        return step


def _success_plan(movement_id="mv1", item_id="i1", from_branch="b1", to_branch="b2"):
    return [
        _FakeCursor(one=(
            movement_id, item_id, from_branch, to_branch, "u-staff",
            "completed", "Routine transfer", "2026-01-05T10:00:00Z", "2026-01-05T10:00:00Z",
        )),
        _FakeCursor(one=("Beirut Main",)),
        _FakeCursor(one=("Jounieh Branch",)),
        _FakeCursor(one=("Staff Person",)),
    ]


def test_create_movement_requires_rls_connection(client, db, as_staff):
    with pytest.raises(HTTPException) as exc:
        inventory_service.create_movement(
            None, item_id="i1", from_branch_id="b2", to_branch_id="b1",
            staff_id="u-staff", notes=None,
        )
    assert exc.value.status_code == 500


def test_create_movement_same_branch_is_400(client, db, as_admin):
    with pytest.raises(HTTPException) as exc:
        inventory_service.create_movement(
            _FakeConn([]), item_id="i1", from_branch_id="b2", to_branch_id="b2",
            staff_id="u-staff", notes=None,
        )
    assert exc.value.status_code == 400
    assert "must differ" in exc.value.detail


def test_create_movement_success(client, db, as_staff):
    movement = inventory_service.create_movement(
        _FakeConn(_success_plan()),
        item_id="i1", from_branch_id="b1", to_branch_id="b2",
        staff_id="u-staff", notes="Routine transfer",
    )
    assert movement["id"] == "mv1"
    assert movement["from_branch_name"] == "Beirut Main"
    assert movement["to_branch_name"] == "Jounieh Branch"
    assert movement["moved_by_staff_name"] == "Staff Person"
    assert movement["status"] == "completed"


def test_insufficient_privilege_maps_to_403(client, db, as_staff):
    conn = _FakeConn([
        psycopg.errors.InsufficientPrivilege("policy_violation_on_movements"),
    ])
    with pytest.raises(HTTPException) as exc:
        inventory_service.create_movement(
            conn, item_id="i1", from_branch_id="b1", to_branch_id="b2",
            staff_id="u-staff", notes=None,
        )
    assert exc.value.status_code == 403
    assert "own branch" in exc.value.detail


def test_trigger_raise_exception_maps_to_400(client, db, as_staff):
    conn = _FakeConn([
        psycopg.errors.RaiseException("item is already sold"),
    ])
    with pytest.raises(HTTPException) as exc:
        inventory_service.create_movement(
            conn, item_id="i1", from_branch_id="b1", to_branch_id="b2",
            staff_id="u-staff", notes=None,
        )
    assert exc.value.status_code == 400
    assert "already sold" in exc.value.detail


def test_check_violation_maps_to_400(client, db, as_staff):
    conn = _FakeConn([
        psycopg.errors.CheckViolation("check constraint"),
    ])
    with pytest.raises(HTTPException) as exc:
        inventory_service.create_movement(
            conn, item_id="i1", from_branch_id="b1", to_branch_id="b2",
            staff_id="u-staff", notes=None,
        )
    assert exc.value.status_code == 400


def test_generic_psycopg_error_maps_to_400(client, db, as_staff):
    conn = _FakeConn([
        psycopg.Error("connection lost"),
    ])
    with pytest.raises(HTTPException) as exc:
        inventory_service.create_movement(
            conn, item_id="i1", from_branch_id="b1", to_branch_id="b2",
            staff_id="u-staff", notes=None,
        )
    assert exc.value.status_code == 400
    assert "Could not record movement" in exc.value.detail


def test_staff_cannot_move_from_other_branch(client, db, as_staff):
    resp = client.post(
        "/api/v1/inventory/movements",
        json={"item_id": "i1", "from_branch_id": "b1", "to_branch_id": "b2"},
    )
    assert resp.status_code == 403
    assert "own branch" in resp.json()["detail"]


def test_admin_can_move_any_branch_to_missing_rls_returns_500(client, db, as_admin):
    """Admin passes the route precheck; without SUPABASE_DB_URL the RLS path 500s."""
    resp = client.post(
        "/api/v1/inventory/movements",
        json={"item_id": "i1", "from_branch_id": "b1", "to_branch_id": "b2"},
    )
    assert resp.status_code == 500
    assert "SUPABASE_DB_URL" in resp.json()["detail"]


def test_requires_staff(client, as_customer):
    resp = client.get("/api/v1/inventory/items/i1/movements")
    assert resp.status_code == 403


def test_list_movements_for_item_requires_conn(client, db, as_admin):
    with pytest.raises(HTTPException) as exc:
        inventory_service.list_movements_for_item(None, "i1")
    assert exc.value.status_code == 500


def test_list_movements_for_item_success(client, db, as_admin):
    conn = _FakeConn([
        _FakeCursor(all=[
            ("mv9", "i1", "b1", "Beirut Main", "b2", "Jounieh Branch", "u-staff", "Staff Person", "completed", "x", "2026-01-05T10:00:00Z", "2026-01-05T10:00:00Z"),
        ]),
    ])
    movements = inventory_service.list_movements_for_item(conn, "i1")
    assert len(movements) == 1
    assert movements[0]["from_branch_name"] == "Beirut Main"
    assert movements[0]["to_branch_name"] == "Jounieh Branch"
    assert movements[0]["moved_by_staff_name"] == "Staff Person"
    assert movements[0]["id"] == "mv9"