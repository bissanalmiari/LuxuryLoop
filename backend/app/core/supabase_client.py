from functools import lru_cache
import httpx
from supabase import create_client, Client

from app.core.config import settings


def _create_admin_client() -> Client:
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    old_session = client.postgrest.session
    client.postgrest.session = httpx.Client(
        base_url=old_session.base_url,
        headers=dict(old_session.headers),
        follow_redirects=True,
        http2=False,
        timeout=120,
    )
    old_session.close()
    return client


@lru_cache
def get_supabase_admin() -> Client:
    """
    Service-role client for privileged server-side operations
    (bypasses RLS). Never expose this key to the frontend.
    """
    return _create_admin_client()


@lru_cache
def get_supabase_anon() -> Client:
    """Anon-key client, respects RLS — for user-scoped operations."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)
