from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.preference import PreferenceUpdate, PreferenceResponse
from app.services.preference_service import PreferenceService

router = APIRouter(tags=["preferences"])
Database = Annotated[Session, Depends(get_db)]


@router.get("/memberships/{membership_id}/preferences", response_model=PreferenceResponse)
def get_preferences(membership_id: UUID, db: Database):
    return PreferenceService(db).get(membership_id)


@router.put("/memberships/{membership_id}/preferences", response_model=PreferenceResponse)
def update_preferences(membership_id: UUID, data: PreferenceUpdate, db: Database):
    return PreferenceService(db).update(membership_id, data)
