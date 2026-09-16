"""End-to-end role check against a live Supabase project.

Creates admin / staff / customer test users via the service-role client
(email_confirm=True so no inbox is needed), signs each in to obtain a real
JWT, decodes it with the backend's own logic, and asserts the expected role.

Usage (from the backend directory):
    python scripts/e2e_auth.py
"""

import os
import sys
import time
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.supabase_client import get_supabase_admin, get_supabase_anon
from app.core.security import decode_user_token, require_role

PASSWORD = "Password123!"


def create_user(client, email: str, role: str, app_role: bool) -> str:
    meta = {"full_name": f"E2E {role.title()}", "role": role}
    payload = {
        "email": email,
        "password": PASSWORD,
        "email_confirm": True,
        "user_metadata": meta,
    }
    if app_role:
        payload["app_metadata"] = {"role": role}
    client.auth.admin.create_user(payload)
    return email


def login_role(email: str):
    resp = get_supabase_anon().auth.sign_in_with_password({"email": email, "password": PASSWORD})
    return decode_user_token(resp.session.access_token)


async def guard_allows(dep, user):
    try:
        await dep(user)
        return True
    except Exception:
        return False


def main():
    stamp = int(time.time())
    client = get_supabase_admin()

    emails = {
        "admin": create_user(client, f"e2e-admin-{stamp}@example.com", "admin", app_role=True),
        "staff": create_user(client, f"e2e-staff-{stamp}@example.com", "staff", app_role=True),
        "customer": create_user(client, f"e2e-customer-{stamp}@example.com", "customer", app_role=False),
    }

    expected = {"admin": "admin", "staff": "staff", "customer": "customer"}

    print("-- Role claims --")
    for role, email in emails.items():
        user = login_role(email)
        status = "PASS" if user.role == expected[role] else "FAIL"
        print(f"[{status}] {role:<8} -> decoded role={user.role!r} (expected {expected[role]!r}) id={user.id[:8]}")
        if status == "FAIL":
            raise SystemExit(1)

    print("-- Guards --")
    checks = [
        ("require_admin accepts admin", "admin", "admin", True),
        ("require_admin rejects staff", "admin", "staff", False),
        ("require_admin rejects customer", "customer", "customer", False),
        ("require_staff accepts admin", "staff", "admin", True),
        ("require_staff accepts staff", "staff", "staff", True),
        ("require_staff rejects customer", "staff", "customer", False),
    ]
    for label, guard_key, role, should_pass in checks:
        dep = require_role("admin") if guard_key == "admin" else require_role("staff", "admin")
        token_user = login_role(emails[role])
        passed = asyncio.run(guard_allows(dep, token_user))
        ok = passed == should_pass
        print(f"[{'PASS' if ok else 'FAIL'}] {label} (expected {'pass' if should_pass else 'deny'})")
        if not ok:
            raise SystemExit(1)

    print("\nAll role checks passed.")


if __name__ == "__main__":
    main()