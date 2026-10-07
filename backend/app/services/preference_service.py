from uuid import UUID

from sqlalchemy.orm import Session

from app.models.preference import UserCompanyPreference
from app.repositories.preference_repository import PreferenceRepository
from app.schemas.preference import PreferenceUpdate
from app.services.membership_service import MembershipService
from app.services.errors import NotFound
from app.services.transaction import transaction


class PreferenceService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = PreferenceRepository(db)

    def get(self, membership_id: UUID) -> UserCompanyPreference:
        MembershipService(self.db).get(membership_id)
        preference = self.repository.get(membership_id)
        if preference is None:
            raise NotFound("Preferences not found for this membership")
        return preference

    def update(self, membership_id: UUID, data: PreferenceUpdate) -> UserCompanyPreference:
        with transaction(self.db):
            membership = MembershipService(self.db).get(membership_id)
            preference = self.repository.get(membership_id)
            if preference is None:
                preference = self.repository.add(UserCompanyPreference(membership=membership))
            self.repository.update(preference, data.model_dump(exclude_unset=True))
        return preference
