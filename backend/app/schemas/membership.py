from uuid import UUID

from pydantic import Field

from app.schemas.identity_base import InputSchema, TimestampResponse


class MembershipCreate(InputSchema):
    user_id: UUID
    job_title: str = Field(min_length=1, max_length=80)


class MembershipResponse(TimestampResponse):
    id: UUID
    company_id: UUID
    user_id: UUID
    job_title: str
