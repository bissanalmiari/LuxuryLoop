"""Per-request DB connection wired into the RLS session-context bridge.

Each request that needs row-level scoping opens a psycopg connection, runs
`set_app_user_context(user_id, role, branch_id)` inside that request's
transaction (`SET LOCAL` semantics), and yields the connection.

Activated by setting SUPABASE_DB_URL (session-pooler URL + DB password) in
backend/.env. Until then the dependency yields None so existing endpoints
keep working untouched.
"""

import logging

from fastapi import Depends

from app.core.config import settings
from app.core.security import get_current_user, CurrentUser

logger = logging.getLogger(__name__)


def rls_connection(user: CurrentUser = Depends(get_current_user)):
    if not settings.supabase_db_url:
        yield None
        return

    import psycopg

    conn = psycopg.connect(settings.supabase_db_url)
    try:
        conn.execute(
            "select public.set_app_user_context(%s, %s, %s)",
            (user.id, user.role, user.branch_id),
        )
        yield conn
    finally:
        conn.close()