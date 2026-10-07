from uuid import UUID

from sqlalchemy.orm import Session

from app.models.identity import CompanyMembership
from app.models.preference import UserCompanyPreference
from app.repositories.membership_repository import MembershipRepository
from app.repositories.preference_repository import PreferenceRepository
from app.schemas.membership import MembershipCreate
from app.services.company_service import CompanyService
from app.services.user_service import UserService
from app.services.errors import Conflict, NotFound
from app.services.transaction import transaction


class MembershipService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = MembershipRepository(db)

    def get(self, membership_id: UUID, *, company_id: UUID | None = None) -> CompanyMembership:
        membership = self.repository.get(membership_id)
        if membership is None or (company_id is not None and membership.company_id != company_id):
            raise NotFound("Membership not found in the requested company")
        CompanyService(self.db).get(membership.company_id)
        return membership

    def list(self, company_id: UUID, offset: int = 0, limit: int = 100) -> list[CompanyMembership]:
        CompanyService(self.db).get(company_id)
        memberships = self.repository.list_for_company(company_id, offset, limit)
        if any(member.company_id != company_id for member in memberships):
            raise NotFound("Membership not found in the requested company")
        return memberships

    def create(self, company_id: UUID, data: MembershipCreate) -> CompanyMembership:
        with transaction(self.db):
            CompanyService(self.db).get(company_id)
            UserService(self.db).get(data.user_id)
            if self.repository.get_by_company_user(company_id, data.user_id):
                raise Conflict("User already belongs to this company")
            membership = self.repository.add(CompanyMembership(company_id=company_id, **data.model_dump()))
            # Relationship ordering lets SQLAlchemy insert the membership first.
            PreferenceRepository(self.db).add(UserCompanyPreference(membership=membership))
        return membership
