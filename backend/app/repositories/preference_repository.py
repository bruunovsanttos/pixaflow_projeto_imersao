from uuid import UUID

from sqlalchemy.orm import Session

from app.models.preference import UserCompanyPreference


class PreferenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, identity: UUID) -> UserCompanyPreference | None:
        return self.db.get(UserCompanyPreference, identity)

    def add(self, entity: UserCompanyPreference) -> UserCompanyPreference:
        self.db.add(entity)
        return entity

    def update(self, entity: UserCompanyPreference, values: dict) -> UserCompanyPreference:
        for name, value in values.items():
            setattr(entity, name, value)
        return entity
