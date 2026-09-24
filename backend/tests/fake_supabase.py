"""
In-memory fake Supabase client so the API can be integration-tested without
a live database. Implements just the fluent chain surface the services use:
  table(...).select(...).eq/in_/or_/order/limit/range/maybe_single/single
 + .insert/.upsert/.update/.delete/.rpc  and client.auth.admin.*
"""
from __future__ import annotations

import re
from typing import Any


def _matches(row: dict, filters: list) -> bool:
    for key, val in filters:
        if key == "__or__":
            ors = val
            for group in ors:
                if all(_matches(row, [(k, v)]) for k, v in group):
                    return True
            return False
        if key == "__in__":
            col, values = val
            if row.get(col) not in values:
                return False
        else:
            if row.get(key) != val:
                return False
    return True


class FakeResult:
    def __init__(self, data: Any, count: int = 0):
        self.data = data
        self.count = count


class FakeTable:
    def __init__(self, client: "FakeSupabase", name: str):
        self.client = client
        self.name = name
        self._op: str | None = None
        self._payload: Any = None
        self._on_conflict: str | None = None
        self._ignore_duplicates = False
        self._columns: str = "*"
        self._filters: list = []
        self._order: tuple | None = None
        self._limit: int | None = None
        self._range: tuple | None = None
        self._single = False

    def select(self, columns: str = "*", count: str | None = None):
        self._op = "select"
        self._columns = columns
        self._count_exact = count == "exact"
        return self

    def eq(self, col: str, value):
        self._filters.append((col, value))
        return self

    def neq(self, col: str, value):
        self._filters.append((col, value, "neq"))
        return self

    def in_(self, col: str, values: list):
        self._filters.append(("__in__", (col, values)))
        return self

    def or_(self, or_str: str):
        # e.g. "title.ilike.%x%,model.ilike.%x%" -> treat as OR list of eq-ish sub-filters
        groups = []
        for part in or_str.split(","):
            col = part.split(".")[0]
            val = part.split("%")[1] if "%" in part else ""
            groups.append([(col, val)])
        self._filters.append(("__or__", groups))
        return self

    def order(self, col: str, desc: bool = False):
        self._order = (col, desc)
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    def range(self, start: int, end: int):
        self._range = (start, end)
        return self

    def maybe_single(self):
        self._single = True
        return self

    def single(self):
        self._single = True
        return self

    def insert(self, rows):
        self._op = "insert"
        self._payload = rows
        return self

    def upsert(self, rows, on_conflict: str | None = None, ignore_duplicates: bool = False):
        self._op = "upsert"
        self._payload = rows
        self._on_conflict = on_conflict
        self._ignore_duplicates = ignore_duplicates
        return self

    def update(self, data: dict):
        self._op = "update"
        self._payload = data
        return self

    def delete(self):
        self._op = "delete"
        return self

    # -- execution -------------------------------------------------------
    def execute(self) -> FakeResult:
        table_rows = self.client._rows.setdefault(self.name, [])
        if self._op == "select":
            filtered = [r for r in table_rows if _matches(r, self._filters)]
            if self._order:
                col, desc = self._order
                filtered = sorted(filtered, key=lambda r: str(r.get(col) or ""), reverse=desc)
            count = len(filtered)
            if self._range:
                start, end = self._range
                filtered = filtered[start : end + 1]
            elif self._limit is not None:
                filtered = filtered[: self._limit]
            if self._single:
                filtered = filtered[:1]
                if not filtered:
                    return FakeResult(None, count=count)
                row = filtered[0]
                if self._columns and self._columns != "*":
                    row = self._select_columns(row)
                return FakeResult(row, count=count)
            if self._columns and self._columns != "*":
                rows = []
                for r in filtered:
                    rows.append(self._select_columns(r))
                filtered = rows
            return FakeResult(filtered, count=count)
        if self._op == "insert":
            rows = self._payload if isinstance(self._payload, list) else [self._payload]
            out = []
            for row in rows:
                if "id" not in row:
                    row = {**row, "id": f"id-{len(table_rows) + len(out) + 1}"}
                row = {**row, "created_at": row.get("created_at", "2026-01-01T00:00:00Z")}
                defaults = {
                    "authentication_requests": {"status": "submitted", "submitted_at": row["created_at"]},
                }
                row = {**defaults.get(self.name, {}), **row}
                table_rows.append(row)
                out.append(row)
            return FakeResult(out, count=len(out))
        if self._op == "upsert":
            rows = self._payload if isinstance(self._payload, list) else [self._payload]
            conflict_cols = [c.strip() for c in (self._on_conflict or "").split(",") if c.strip()]
            out = []
            for row in rows:
                existing = None
                if conflict_cols:
                    existing = next(
                        (r for r in table_rows if all(r.get(c) == row.get(c) for c in conflict_cols)),
                        None,
                    )
                if existing is not None:
                    if not self._ignore_duplicates:
                        existing.update({k: v for k, v in row.items()})
                    out.append(existing)
                else:
                    newrow = {**row, "id": row.get("id", f"id-{len(table_rows) + len(out) + 1}")}
                    table_rows.append(newrow)
                    out.append(newrow)
            return FakeResult(out, count=len(out))
        if self._op == "update":
            out = []
            for r in table_rows:
                if _matches(r, self._filters):
                    r.update({k: v for k, v in self._payload.items()})
                    out.append(r)
            return FakeResult(out, count=len(out))
        if self._op == "delete":
            remaining = [r for r in table_rows if not _matches(r, self._filters)]
            removed = [r for r in table_rows if _matches(r, self._filters)]
            self.client._rows[self.name] = remaining
            return FakeResult(removed, count=len(removed))
        raise RuntimeError(f"Unsupported table op: {self._op}")

    def _select_columns(self, row: dict) -> dict:
        """Expand the embedded-resource selects like 'brands(name)' / 'item_images(...)'."""
        result = dict(row)
        embedded = re.findall(r"([a-z_]+)\(([^()]*(?:\([^()]*\))?[^()]*)\)", self._columns)
        for rel, inner in embedded:
            if rel in ("brands", "categories", "branches", "users"):
                fk = {"brands": "brand_id", "categories": "category_id", "branches": "branch_id", "users": "user_id"}[rel]
                target = next(
                    (r for r in self.client._rows.get(rel, []) if r.get("id") == row.get(fk)),
                    None,
                )
                result[rel] = {k.strip(): (target or {}).get(k.strip()) for k in inner.split(",")} if target else {}
            elif rel in ("item_images",):
                fk = "item_id"
                imgs = [r for r in self.client._rows.get(rel, []) if r.get(fk) == row.get("id")]
                result[rel] = [
                    {k.strip(): (img or {}).get(k.strip()) for k in inner.split(",")}
                    for img in imgs
                ]
            elif rel in ("items",):
                fk = "item_id"
                item = next(
                    (r for r in self.client._rows.get("items", []) if r.get("id") == row.get(fk)),
                    None,
                )
                if item is None:
                    result[rel] = None
                else:
                    cols = [c.strip() for c in inner.split(",")]
                    out = {c: item.get(c) for c in cols if "(" not in c}
                    for c in cols:
                        m = re.match(r"([a-z_]+)\(([^)]*)\)", c)
                        if m:
                            sub_rel, sub_cols = m.groups()
                            if sub_rel in ("item_images",):
                                imgs = [r for r in self.client._rows.get(sub_rel, []) if r.get("item_id") == item.get("id")]
                                out[sub_rel] = [
                                    {k.strip(): (img or {}).get(k.strip()) for k in sub_cols.split(",")}
                                    for img in imgs
                                ]
                    result[rel] = out
        return result


class _FakeAuthAdmin:
    def __init__(self, client: "FakeSupabase"):
        self.client = client

    def create_user(self, data: dict):
        rows = self.client._rows.setdefault("users", [])
        user_id = data.get("id") or f"user-{len(rows) + 1}"
        meta = data.get("user_metadata") or {}
        app_meta = data.get("app_metadata") or {}
        profile = {
            "id": user_id,
            "email": data.get("email", ""),
            "full_name": meta.get("full_name") or "",
            "role": app_meta.get("role") or meta.get("role") or "customer",
            "is_active": True,
        }
        for r in rows:
            if r.get("id") == user_id:
                r.update(profile)
                break
        else:
            rows.append(profile)
        self.client._auth_users.append(profile)
        user = type("U", (), {"id": profile["id"], "email": profile["email"]})()
        return type("R", (), {"user": user})()

    def update_user_by_id(self, user_id: str, data: dict):
        rows = self.client._rows.setdefault("users", [])
        app_meta = data.get("app_metadata") or {}
        user_meta = data.get("user_metadata") or {}
        for r in rows:
            if r.get("id") == user_id:
                if "is_active" in app_meta:
                    r["is_active"] = app_meta["is_active"]
                if "role" in app_meta:
                    r["role"] = app_meta["role"]
                if user_meta:
                    for k, v in user_meta.items():
                        r[k] = v
                break
        return type("R", (), {})()

    def delete_user(self, user_id: str):
        self.client._rows.setdefault("users", [])[:] = [
            r for r in self.client._rows.get("users", []) if r.get("id") != user_id
        ]
        return type("R", (), {})()


class FakeSupabase:
    """Minimal in-memory stand-in for the supabase-py admin client."""

    def __init__(self):
        self._rows: dict[str, list[dict]] = {}
        self._auth_users: list[dict] = []
        self.auth = type("Auth", (), {"admin": _FakeAuthAdmin(self)})()

    def table(self, name: str) -> FakeTable:
        return FakeTable(self, name)

    def rpc(self, fn: str, params: dict | None = None):
        fake = self

        class _Rpc:
            def execute(self):
                if fn == "checkout_cart_for_branch":
                    return FakeResult(self._checkout(params))
                return FakeResult([])

            def _checkout(self, p: dict | None):
                p = p or {}
                customer = p.get("p_customer_id")
                branch = p.get("p_branch_id")
                orders = fake._rows.setdefault("orders", [])
                payments = fake._rows.setdefault("payments", [])
                order_items = fake._rows.setdefault("order_items", [])
                cart = fake._rows.setdefault("cart_items", [])
                item_rows = fake._rows.setdefault("items", [])

                order_id = f"ord-{branch}-{len(orders) + 1}"
                total = 0.0
                items_to_remove = []
                for c in cart:
                    if c.get("customer_id") != customer:
                        continue
                    item = next((i for i in item_rows if i.get("id") == c.get("item_id")), None)
                    if not item or item.get("branch_id") != branch:
                        continue
                    if item.get("status") != "available":
                        raise RuntimeError(f"ITEM_UNAVAILABLE:{c.get('item_id')}")
                    total += float(item.get("selling_price") or 0)
                    item["status"] = "reserved"
                    order_items.append({
                        "id": f"oi-{len(order_items) + 1}",
                        "order_id": order_id,
                        "item_id": c.get("item_id"),
                        "unit_price": float(item.get("selling_price") or 0),
                    })
                    items_to_remove.append(c)

                orders.append({
                    "id": order_id,
                    "customer_id": customer,
                    "branch_id": branch,
                    "pickup_branch_id": p.get("p_pickup_branch_id"),
                    "channel": "online",
                    "fulfillment_type": p.get("p_fulfillment_type"),
                    "address_id": p.get("p_address_id"),
                    "status": "pending",
                    "total_amount": total,
                    "created_at": "2026-01-01T00:00:00Z",
                })
                payments.append({
                    "id": f"pay-{len(payments) + 1}",
                    "order_id": order_id,
                    "amount": total,
                    "status": "pending",
                    "payment_method": p.get("p_payment_method"),
                    "currency": "USD",
                    "stripe_payment_intent_id": p.get("p_stripe_payment_intent_id"),
                })
                for c in items_to_remove:
                    cart.remove(c)
                return order_id

        return _Rpc()

    def seed(self, table: str, rows: list[dict]):
        self._rows.setdefault(table, []).extend(rows)
        return self


def seed_defaults(db: FakeSupabase) -> FakeSupabase:
    db.seed("branches", [
        {"id": "b1", "name": "Beirut Main", "address": "Hamra St", "city": "Beirut", "country": "Lebanon", "is_active": True, "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z"},
        {"id": "b2", "name": "Jounieh Branch", "address": "Kfarhabida", "city": "Jounieh", "country": "Lebanon", "is_active": True, "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z"},
    ])
    db.seed("categories", [
        {"id": "c1", "name": "Watches", "description": "Luxury timepieces", "created_at": "2026-01-01T00:00:00Z"},
        {"id": "c2", "name": "Handbags", "description": "Designer handbags", "created_at": "2026-01-01T00:00:00Z"},
    ])
    db.seed("brands", [
        {"id": "br1", "name": "Rolex", "description": "Swiss watches", "created_at": "2026-01-01T00:00:00Z"},
        {"id": "br2", "name": "Chanel", "description": "French fashion", "created_at": "2026-01-01T00:00:00Z"},
    ])
    db.seed("items", [
        {"id": "i1", "item_code": "LL-001", "category_id": "c1", "brand_id": "br1", "branch_id": "b1", "title": "Rolex Submariner", "model": "126610LN", "description": "Black dial", "condition": "Excellent", "ownership_type": "store_owned", "cost": 8500, "selling_price": 12900, "discount": 0, "status": "available", "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z", "video_url": None, "serial_reference": None},
        {"id": "i2", "item_code": "LL-002", "category_id": "c2", "brand_id": "br2", "branch_id": "b1", "title": "Chanel Classic Flap", "model": "Medium", "description": "Black caviar", "condition": "Excellent", "ownership_type": "store_owned", "cost": 6200, "selling_price": 8900, "discount": 0, "status": "sold", "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z", "video_url": None, "serial_reference": None},
    ])
    db.seed("item_images", [
        {"id": "img1", "item_id": "i1", "file_url": "/images/watch.jpg", "sort_order": 0, "created_at": "2026-01-01T00:00:00Z"},
    ])
    db.seed("users", [
        {"id": "u-customer", "email": "customer@example.com", "full_name": "Jane Doe", "phone": "+961 3 123 456", "role": "customer", "branch_id": None, "is_active": True, "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z"},
        {"id": "u-admin", "email": "admin@example.com", "full_name": "Admin Person", "phone": "+961 1 111 111", "role": "admin", "branch_id": None, "is_active": True, "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z"},
        {"id": "u-staff", "email": "staff@example.com", "full_name": "Staff Person", "phone": "+961 1 222 222", "role": "staff", "branch_id": "b2", "is_active": True, "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z"},
    ])
    return db