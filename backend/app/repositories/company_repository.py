from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import Company


class CompanyRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, identity: UUID) -> Company | None:
        return self.db.get(Company, identity)

    def add(self, entity: Company) -> Company:
        self.db.add(entity)
        return entity

    def get_by_slug(self, slug: str) -> Company | None:
        return self.db.scalar(select(Company).where(Company.slug == slug))

    def list(self, offset: int = 0, limit: int = 100) -> list[Company]:
        return list(self.db.scalars(select(Company).order_by(Company.created_at, Company.id).offset(offset).limit(limit)))
