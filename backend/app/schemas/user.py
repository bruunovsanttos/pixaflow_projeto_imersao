from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.identity_base import InputSchema, TimestampResponse


class UserCreate(InputSchema):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr = Field(max_length=254)


class UserResponse(TimestampResponse):
    id: UUID
    name: str
    email: str
