from uuid import UUID

from sqlalchemy.orm import Session

from app.models.identity import Company
from app.repositories.company_repository import CompanyRepository
from app.schemas.company import CompanyCreate
from app.services.errors import Conflict, NotFound
from app.services.transaction import transaction


class CompanyService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = CompanyRepository(db)

    def get(self, company_id: UUID) -> Company:
        company = self.repository.get(company_id)
        if company is None:
            raise NotFound("Company not found")
        return company

    def list(self, offset: int = 0, limit: int = 100) -> list[Company]:
        return self.repository.list(offset, limit)

    def create(self, data: CompanyCreate) -> Company:
        with transaction(self.db):
            if self.repository.get_by_slug(data.slug):
                raise Conflict("Company slug already exists")
            company = self.repository.add(Company(**data.model_dump()))
        return company
