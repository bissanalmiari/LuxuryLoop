import importlib
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402
from app.core.security import CurrentUser, get_current_user, get_staff_context  # noqa: E402

from tests.fake_supabase import FakeSupabase, seed_defaults  # noqa: E402

# Every module that does `from app.core.supabase_client import get_supabase_admin`.
_AFFECTED_MODULES = [
    "app.api.v1.routes.product",
    "app.api.v1.routes.cart",
    "app.api.v1.routes.auth_routes",
    "app.api.v1.routes.favorites",
    "app.api.v1.routes.order",
    "app.api.v1.routes.reference_data",
    "app.api.v1.routes.consignment",
    "app.api.v1.routes.staff",
    "app.api.v1.routes.admin_auth",
    "app.api.v1.routes.reports",
    "app.api.v1.routes.newsletter",
    "app.api.v1.routes.contact",
    "app.core.security",
]


@pytest.fixture
def db() -> FakeSupabase:
    return seed_defaults(FakeSupabase())


@pytest.fixture
def client(db: FakeSupabase, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    for mod_name in _AFFECTED_MODULES:
        mod = importlib.import_module(mod_name)
        monkeypatch.setattr(mod, "get_supabase_admin", lambda: db)
    # Never touch the real Postgres/Supabase from tests.
    import app.core.security as security
    monkeypatch.setattr(security, "_resolve_role_from_db", lambda user_id: (None, None))
    # Never hit the real Stripe API from tests — swap in a fake client.
    from app.core.config import settings
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_fake_for_tests")
    import app.services.payment_service as payment_service
    monkeypatch.setattr(payment_service, "stripe", _FakeStripe())
    app.dependency_overrides.clear()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class _FakeSession:
    def __init__(self, sid: str):
        self.id = sid
        self.url = f"https://checkout.stripe.com/c/pay/{sid}"
        self.payment_status = "paid"


class _FakeStripe:
    """Mirrors the small slice of the Stripe API the app uses. Uses random
    cs_test_* ids so the code path (real-API branch) is exercised as-is."""

    def __init__(self):
        self.sessions: dict[str, _FakeSession] = {}

    class checkout:
        class Session:
            @staticmethod
            def create(*args, **kwargs):
                import uuid
                fake = _FakeStripe._instance
                sid = f"cs_test_{uuid.uuid4().hex}"
                session = _FakeSession(sid)
                fake.sessions[sid] = session
                return session

            @staticmethod
            def retrieve(sid: str):
                return _FakeStripe._instance.sessions.get(sid) or _FakeSession(sid)


_FakeStripe._instance = _FakeStripe()


def _set_user(role: str, user_id: str = "u-customer"):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id,
        email=f"{user_id}@example.com",
        role=role,
        branch_id="b2" if role == "staff" else None,
    )


@pytest.fixture
def as_customer():
    _set_user("customer")
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def as_staff():
    _set_user("staff", "u-staff")
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def as_admin():
    _set_user("admin", "u-admin")
    yield
    app.dependency_overrides.clear()