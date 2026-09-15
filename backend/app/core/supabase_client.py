from functools import lru_cache
from supabase import create_client, Client

from app.core.config import settings


@lru_cache
def get_supabase_admin() -> Client:
    """
    Service-role client for privileged server-side operations
    (bypasses RLS). Never expose this key to the frontend.
    """
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@lru_cache
def get_supabase_anon() -> Client:
    """Anon-key client, respects RLS — for user-scoped operations."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)
