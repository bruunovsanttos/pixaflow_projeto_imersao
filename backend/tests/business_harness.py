"""Only old business-rule tests bypass authentication. Security tests use the real app."""
from uuid import UUID
from fastapi import Request, Depends, HTTPException
from sqlalchemy import select, inspect
from types import SimpleNamespace
from sqlalchemy.orm import Session
from app.main import create_app as production_app
from app.core.security import authorize
from app.database.session import get_db
from app.models.identity import User, Company, CompanyMembership

def create_app():
    app = production_app()
    def business_actor(request: Request, db: Session = Depends(get_db)):
        if not inspect(db.bind).has_table("users"): return
        user = db.scalar(select(User))
        request.state.user_id = user.id if user else UUID(int=0)
        company = request.path_params.get('company_id')
        request.state.membership = None
        if company:
            try: company_id = UUID(str(company))
            except ValueError: return
            if request.method == 'GET' and request.url.path.endswith('/memberships') and not db.get(Company, company_id):
                raise HTTPException(404, 'Empresa não encontrada')
            request.state.membership = db.scalar(select(CompanyMembership).where(CompanyMembership.company_id == company_id))
            if request.url.path.endswith('/saved-scenarios'):
                selected = request.query_params.get('membership_id')
                if selected:
                    try: request.state.membership = SimpleNamespace(id=UUID(selected))
                    except ValueError: pass
                if not request.state.membership: request.state.membership = SimpleNamespace(id=UUID(int=0))
    app.dependency_overrides[authorize] = business_actor
    return app
