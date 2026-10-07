from uuid import UUID

from pydantic import Field

from app.schemas.identity_base import InputSchema, TimestampResponse


class CompanyCreate(InputSchema):
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=1, max_length=160)
    segment: str = Field(min_length=1, max_length=120)


class CompanyResponse(TimestampResponse):
    id: UUID
    slug: str
    name: str
    segment: str
