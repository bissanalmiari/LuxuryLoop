import re
from typing import List, Optional
from pydantic import BaseModel, field_validator

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class NewsletterSubscribe(BaseModel):
    email: str
    source: str = "footer"

    @field_validator("email")
    def validate_email(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("A valid email address is required")
        return v

    @field_validator("source")
    def validate_source(cls, v: str) -> str:
        return (v or "footer").strip().lower()[:40]


class SubscriberOut(BaseModel):
    id: str
    email: str
    source: str
    created_at: Optional[str] = None


class SubscriberListResponse(BaseModel):
    subscribers: List[SubscriberOut]
    total: int