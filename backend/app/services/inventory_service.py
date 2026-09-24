"""
Branch-transfer service for individual items.

Deliberately does NOT use `get_supabase_admin()` (the service-role REST
client used elsewhere, e.g. item_service.py) — that key bypasses RLS
entirely. Inventory movements are exactly the branch-sensitive operation
the instructor flagged, so this goes through the RLS-connected path
(`rls_connection`) so Postgres itself enforces:
  - the source-branch trigger (`enforce_movement_source_branch`)
  - branch-scoped RLS (`inventory_movements_insert_own_branch`)
instead of trusting application code alone.
"""

from typing import Optional
import psycopg
from fastapi import HTTPException

_MOVEMENT_COLS = [
    "id", "item_id", "from_branch_id", "to_branch_id",
    "moved_by_staff_id", "status", "notes", "moved_at", "created_at",
]


def create_movement(
    conn,
    item_id: str,
    from_branch_id: str,
    to_branch_id: str,
    staff_id: str,
    notes: Optional[str],
) -> dict:
    if conn is None:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_DB_URL is not configured — branch-scoped inventory "
                   "movements require the RLS-connected database path.",
        )
    if from_branch_id == to_branch_id:
        raise HTTPException(status_code=400, detail="Source and destination branch must differ")

    try:
        row = conn.execute(
            """
            insert into public.inventory_movements
              (item_id, from_branch_id, to_branch_id, moved_by_staff_id, status, notes)
            values (%s, %s, %s, %s, 'completed', %s)
            returning id, item_id, from_branch_id, to_branch_id,
                      moved_by_staff_id, status, notes, moved_at, created_at
            """,
            (item_id, from_branch_id, to_branch_id, staff_id, notes),
        ).fetchone()
    except psycopg.errors.InsufficientPrivilege:
        # RLS WITH CHECK failed — staff tried to move FROM a branch that isn't theirs.
        raise HTTPException(status_code=403, detail="You can only transfer items out of your own branch")
    except psycopg.errors.RaiseException as e:
        # Our trigger's explicit raise — wrong from_branch_id, sold item, etc.
        raise HTTPException(status_code=400, detail=str(e).strip())
    except psycopg.errors.CheckViolation:
        raise HTTPException(status_code=400, detail="Source and destination branch must differ")
    except psycopg.Error as e:
        raise HTTPException(status_code=400, detail=f"Could not record movement: {e}")

    if row is None:
        raise HTTPException(status_code=400, detail="Movement was not recorded")

    return _enrich(conn, dict(zip(_MOVEMENT_COLS, row)))


def list_movements_for_item(conn, item_id: str) -> list[dict]:
    if conn is None:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_DB_URL is not configured — movement history requires the RLS-connected database path.",
        )
    rows = conn.execute(
        """
        select m.id, m.item_id, m.from_branch_id, fb.name as from_branch_name,
               m.to_branch_id, tb.name as to_branch_name,
               m.moved_by_staff_id, coalesce(u.full_name, u.email, '') as moved_by_staff_name,
               m.status, m.notes, m.moved_at, m.created_at
        from public.inventory_movements m
        join public.branches fb on fb.id = m.from_branch_id
        join public.branches tb on tb.id = m.to_branch_id
        left join public.users u on u.id = m.moved_by_staff_id
        where m.item_id = %s
        order by m.moved_at desc
        """,
        (item_id,),
    ).fetchall()
    cols = ["id", "item_id", "from_branch_id", "from_branch_name", "to_branch_id",
            "to_branch_name", "moved_by_staff_id", "moved_by_staff_name",
            "status", "notes", "moved_at", "created_at"]
    movements = [dict(zip(cols, r)) for r in rows]
    for movement in movements:
        _normalize_ids(movement)
    return movements


def _enrich(conn, data: dict) -> dict:
    _normalize_ids(data)

    fb = conn.execute("select name from public.branches where id = %s", (data["from_branch_id"],)).fetchone()
    tb = conn.execute("select name from public.branches where id = %s", (data["to_branch_id"],)).fetchone()
    staff = conn.execute(
        "select coalesce(full_name, email, '') from public.users where id = %s",
        (data["moved_by_staff_id"],),
    ).fetchone()
    data["from_branch_name"] = fb[0] if fb else ""
    data["to_branch_name"] = tb[0] if tb else ""
    data["moved_by_staff_name"] = staff[0] if staff else ""
    return data


def _normalize_ids(data: dict) -> None:
    for key in ("id", "item_id", "from_branch_id", "to_branch_id", "moved_by_staff_id"):
        data[key] = str(data[key])