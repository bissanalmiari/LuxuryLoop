import re
from typing import List, Literal, Optional
from pydantic import BaseModel, field_validator

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Per-field max lengths that mirror the DB column limits.
_MAX_NAME = 120
_MAX_EMAIL = 254
_MAX_PHONE = 40
_MAX_SUBJECT = 200
_MAX_MESSAGE = 5000


class ContactCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    subject: Optional[str] = None
    message: str

    @field_validator("name")
    def validate_name(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Name is required")
        return v[:_MAX_NAME]

    @field_validator("email")
    def validate_email(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("A valid email address is required")
        return v[:_MAX_EMAIL]

    @field_validator("phone")
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return (v or "").strip()[:_MAX_PHONE] or None

    @field_validator("subject")
    def validate_subject(cls, v: Optional[str]) -> Optional[str]:
        return (v or "").strip()[:_MAX_SUBJECT] or None

    @field_validator("message")
    def validate_message(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Message is required")
        if len(v) < 5:
            raise ValueError("Message is too short")
        return v[:_MAX_MESSAGE]


class ContactOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    name: str
    email: str
    phone: Optional[str] = None
    subject: Optional[str] = None
    message: str
    status: str = "new"
    created_at: Optional[str] = None


class ContactListResponse(BaseModel):
    messages: List[ContactOut]
    total: int


class ContactStatusUpdate(BaseModel):
    status: Literal["new", "in_progress", "resolved"]