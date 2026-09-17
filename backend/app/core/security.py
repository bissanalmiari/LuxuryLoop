from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jws, JWTError
import httpx

from app.core.config import settings
from app.core.supabase_client import get_supabase_admin

bearer_scheme = HTTPBearer(auto_error=False)

_jwks_by_kid: dict[str, dict] | None = None


def _load_jwks() -> dict[str, dict]:
    """Fetch the project's signing keys once and cache by kid."""
    global _jwks_by_kid
    for attempt in range(3):
        try:
            resp = httpx.get(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json", timeout=10)
            resp.raise_for_status()
            _jwks_by_kid = {key["kid"]: key for key in resp.json().get("keys", [])}
            return _jwks_by_kid
        except Exception:
            if attempt == 2:
                raise
    return {}  # pragma: no cover


def _resolve_key(header: dict) -> str | dict:
    global _jwks_by_kid
    alg = header.get("alg")
    if alg == "HS256":
        return settings.supabase_jwt_secret

    kid = header.get("kid")
    jwks = _load_jwks() if _jwks_by_kid is None else _jwks_by_kid
    key = jwks.get(kid)
    if key is None:
        # kid may have rotated — refresh once
        _jwks_by_kid = None
        jwks = _load_jwks()
        key = jwks.get(kid)
    if key is None:
        raise ValueError("No signing key found for this token")
    return key


class CurrentUser:
    """Minimal user context decoded from the Supabase-issued JWT."""

    def __init__(self, id: str, email: str | None, role: str, branch_id: str | None = None):
        self.id = id
        self.email = email
        self.role = role
        self.branch_id = branch_id


def decode_user_token(token: str) -> CurrentUser:
    """Validate a Supabase JWT (HS256 or ES256) and build user context from its claims."""
    header = jws.get_unverified_header(token)
    alg = header.get("alg")
    if alg not in ("HS256", "ES256"):
        raise ValueError(f"Unsupported JWT alg: {alg}")

    key = _resolve_key(header)
    payload = jwt.decode(token, key, algorithms=[alg], audience="authenticated")

    user_id = payload.get("sub")
    if not user_id:
        raise ValueError("Token missing subject claim")

    app_meta = payload.get("app_metadata") or {}
    user_meta = payload.get("user_metadata") or {}

    role = app_meta.get("role") or user_meta.get("role") or "customer"
    branch_id = app_meta.get("branch_id") or user_meta.get("branch_id")

    return CurrentUser(id=user_id, email=payload.get("email"), role=role, branch_id=branch_id)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    try:
        user = decode_user_token(credentials.credentials)
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    role, branch_id = _resolve_role_from_db(user.id)
    if role:
        # public.users is authoritative; the JWT metadata may lag behind manual edits.
        user.role = role
        user.branch_id = branch_id
    return user


def _resolve_role_from_db(user_id: str) -> tuple[str | None, str | None]:
    """Fetch the authoritative (role, branch_id) from public.users when the DB is reachable."""
    if not settings.supabase_db_url:
        return None, None
    try:
        import psycopg

        conn = psycopg.connect(settings.supabase_db_url)
        try:
            row = conn.execute(
                "select role::text, branch_id::text from public.users where id = %s",
                (user_id,),
            ).fetchone()
        finally:
            conn.close()
        if row:
            return row[0], row[1]
    except Exception:
        pass
    return None, None


def require_role(*roles: str):
    """Dependency factory: allow only the given roles."""

    async def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{'/'.join(roles)} access required",
            )
        return user

    return checker

class StaffContext(CurrentUser):
    """CurrentUser + the branch_id, fetched fresh from `users` — the JWT doesn't carry it."""

    def __init__(self, id: str, email: str | None, role: str, branch_id: str | None, is_active: bool):
        super().__init__(id=id, email=email, role=role)
        self.branch_id = branch_id
        self.is_active = is_active


async def get_staff_context(user: CurrentUser = Depends(get_current_user)) -> StaffContext:
    """
    Re-checks role/branch against the `users` table instead of trusting the
    JWT's app_metadata — that claim can be stale until the token refreshes,
    and it never carries branch_id at all.
    """
    client = get_supabase_admin()
    resp = client.table("users").select("role, branch_id, is_active").eq("id", user.id).single().execute()
    profile = resp.data
    if not profile or profile.get("role") not in ("staff", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff access required")
    if not profile.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    return StaffContext(
        id=user.id,
        email=user.email,
        role=profile["role"],
        branch_id=profile.get("branch_id"),
        is_active=profile.get("is_active", True),
    )


def assert_branch_access(staff: StaffContext, target_branch_id: str) -> None:
    """Admin can touch any branch; staff only their own."""
    if staff.role == "admin":
        return
    if staff.branch_id != target_branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage products at your assigned branch",
        )

require_admin = require_role("admin")
require_staff = require_role("staff", "admin")