from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.identity_base import InputSchema


class SavedScenarioCreate(InputSchema):
    membership_id: UUID
    simulation_id: UUID


class SavedScenarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    membership_id: UUID
    simulation_id: UUID
    created_at: datetime
