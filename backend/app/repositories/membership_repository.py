from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import CompanyMembership


class MembershipRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, identity: UUID) -> CompanyMembership | None:
        return self.db.get(CompanyMembership, identity)

    def add(self, entity: CompanyMembership) -> CompanyMembership:
        self.db.add(entity)
        return entity

    def get_by_company_user(self, company_id: UUID, user_id: UUID) -> CompanyMembership | None:
        return self.db.scalar(select(CompanyMembership).where(
            CompanyMembership.company_id == company_id, CompanyMembership.user_id == user_id,
        ))

    def list_for_company(self, company_id: UUID, offset: int = 0, limit: int = 100) -> list[CompanyMembership]:
        return list(self.db.scalars(select(CompanyMembership).where(
            CompanyMembership.company_id == company_id,
        ).order_by(CompanyMembership.created_at, CompanyMembership.id).offset(offset).limit(limit)))
