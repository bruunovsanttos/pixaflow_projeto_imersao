"""HTTP integration tests against a disposable in-memory database only."""
import importlib
import os
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import UUID, uuid4

# Prevent even an accidental dependency fallback from reaching the configured DB.
os.environ["DATABASE_URL"] = "postgresql+psycopg://test:test@127.0.0.1:1/identity_tests"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.database.session import get_db
from app.main import create_app
from app.models.identity import Company, User, CompanyMembership
from app.models.preference import UserCompanyPreference
from app.services.membership_service import MembershipService
from app.services.errors import NotFound


class IdentityTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(self.engine, tables=[Company.__table__, User.__table__, CompanyMembership.__table__, UserCompanyPreference.__table__])
        self.app = create_app()
        def test_db():
            with Session(self.engine) as db:
                yield db
        self.app.dependency_overrides[get_db] = test_db
        self.client = TestClient(self.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.app.dependency_overrides.clear()
        self.engine.dispose()

    def company(self, slug="acme"):
        response = self.client.post("/api/v1/companies", json={"slug": slug, "name": "Acme", "segment": "Retail"})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def user(self, email="ana@example.com"):
        response = self.client.post("/api/v1/users", json={"name": "Ana", "email": email})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def membership(self, company, user):
        response = self.client.post(f"/api/v1/companies/{company['id']}/memberships", json={"user_id": user["id"], "job_title": "Manager"})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_complete_flow_and_company_isolation(self):
        company, other, user = self.company(), self.company("other"), self.user()
        member = self.membership(company, user)
        second = self.membership(other, user)
        self.assertEqual(self.client.get(f"/api/v1/companies/{company['id']}").json(), company)
        self.assertEqual(self.client.get(f"/api/v1/users/{user['id']}").json(), user)
        self.assertEqual(len(self.client.get("/api/v1/companies").json()), 2)
        self.assertEqual(self.client.get(f"/api/v1/companies/{company['id']}/memberships").json(), [member])
        url = f"/api/v1/memberships/{member['id']}/preferences"
        defaults = self.client.get(url)
        self.assertEqual(defaults.status_code, 200)
        self.assertEqual(defaults.json()["horizon_days"], 7)
        self.assertTrue(defaults.json()["alert_risks"])
        self.assertFalse(defaults.json()["alert_capacity"])
        self.assertEqual(defaults.json()["sensitivity"], "equilibrada")
        updated = self.client.put(url, json={"horizon_days": 30, "sensitivity": "agressiva", "alert_risks": False})
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["horizon_days"], 30)
        self.assertFalse(updated.json()["alert_risks"])
        self.assertTrue(updated.json()["alert_weekly"])
        self.assertEqual(self.client.put(url, json={}).json(), updated.json())
        self.assertEqual(self.client.get(f"/api/v1/memberships/{second['id']}/preferences").json()["horizon_days"], 7)
        with Session(self.engine) as db:
            with self.assertRaises(NotFound):
                MembershipService(db).get(UUID(member["id"]), company_id=UUID(other["id"]))

    def test_conflicts_and_atomic_rollback(self):
        company, user = self.company(), self.user()
        self.assertEqual(self.client.post("/api/v1/companies", json={"slug":"acme","name":"A","segment":"B"}).status_code, 409)
        self.assertEqual(self.client.post("/api/v1/users", json={"name":"A","email":"ana@example.com"}).status_code, 409)
        url = f"/api/v1/companies/{company['id']}/memberships"
        body = {"user_id":user["id"],"job_title":"Manager"}
        def fail_after_insert(repository, preference):
            repository.db.add(preference)
            repository.db.flush()
            raise IntegrityError("insert", {}, Exception("conflict"))
        with patch("app.services.membership_service.PreferenceRepository.add", autospec=True, side_effect=fail_after_insert):
            self.assertEqual(self.client.post(url,json=body).status_code,409)
        self.assertEqual(self.client.get(url).json(), [])
        self.membership(company,user)
        self.assertEqual(self.client.post(url,json=body).status_code,409)
        with Session(self.engine) as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(CompanyMembership)),1)
            self.assertEqual(db.scalar(select(func.count()).select_from(UserCompanyPreference)),1)

    def test_missing_resources(self):
        missing = str(uuid4())
        for url in [f"/companies/{missing}",f"/users/{missing}",f"/companies/{missing}/memberships",f"/memberships/{missing}/preferences"]:
            self.assertEqual(self.client.get("/api/v1"+url).status_code,404)
        self.assertEqual(self.client.put(f"/api/v1/memberships/{missing}/preferences",json={}).status_code,404)
        company, user = self.company(), self.user()
        for company_id,user_id in [(company['id'],missing),(missing,user['id'])]:
            response=self.client.post(f"/api/v1/companies/{company_id}/memberships",json={"user_id":user_id,"job_title":"Manager"})
            self.assertEqual(response.status_code,404)

    def test_validation(self):
        for body in [{"slug":"Bad Slug","name":"A","segment":"B"},{"slug":"ok","name":"   ","segment":"B"}]:
            self.assertEqual(self.client.post("/api/v1/companies",json=body).status_code,422)
        self.assertEqual(self.client.post("/api/v1/users",json={"name":"A","email":"invalid"}).status_code,422)
        self.assertEqual(self.client.get("/api/v1/companies/not-a-uuid").status_code,422)
        self.assertEqual(self.client.get("/api/v1/companies?limit=101").status_code,422)
        company,user=self.company(),self.user()
        member=self.membership(company,user)
        url=f"/api/v1/memberships/{member['id']}/preferences"
        for body in [{"horizon_days":8},{"sensitivity":"invalid"},{"alert_risks":None},{"alert_risks":"false"},{"membership_id":str(uuid4())}]:
            self.assertEqual(self.client.put(url,json=body).status_code,422)
        self.assertEqual(self.client.post(f"/api/v1/companies/{company['id']}/memberships",json={"user_id":user['id'],"job_title":"Manager","company_id":str(uuid4())}).status_code,422)

    def test_legacy_membership_preferences(self):
        company,user=self.company(),self.user()
        with Session(self.engine) as db:
            member=CompanyMembership(company_id=UUID(company['id']),user_id=UUID(user['id']),job_title="Legacy")
            db.add(member)
            db.commit()
            member_id=member.id
        url=f"/api/v1/memberships/{member_id}/preferences"
        self.assertEqual(self.client.get(url).status_code,404)
        response=self.client.put(url,json={"alert_capacity":True})
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json()["horizon_days"],7)
        self.assertTrue(response.json()["alert_capacity"])

    def test_imports_openapi_health_and_cors(self):
        for folder in ["schemas","repositories","services","routes"]:
            for path in Path("app",folder).glob("*.py"):
                importlib.import_module(f"app.{folder}.{path.stem}")
        self.assertEqual(self.client.get("/api/v1/health").json(),{"status":"ok"})
        schema=self.client.get("/openapi.json")
        self.assertEqual(schema.status_code,200)
        self.assertEqual(sum(method in {"get","post","put"} for path in schema.json()["paths"].values() for method in path),21)
        response=self.client.options("/api/v1/companies",headers={"Origin":"http://localhost:5173","Access-Control-Request-Method":"POST"})
        self.assertEqual(response.status_code,200)


if __name__ == "__main__":
    unittest.main()
