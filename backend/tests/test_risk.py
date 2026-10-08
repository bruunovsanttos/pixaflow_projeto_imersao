"""Risk integration tests: disposable SQLite, never the configured PostgreSQL."""
import importlib
import os
import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

os.environ["DATABASE_URL"] = "postgresql+psycopg://test:test@127.0.0.1:1/risk_tests"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.database.session import get_db
from app.main import create_app
from app.models.analysis import AnalysisRun
from app.models.identity import Company
from app.models.risk import Risk, RiskRecommendation


class RiskTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(self.engine, tables=[Company.__table__, AnalysisRun.__table__, Risk.__table__, RiskRecommendation.__table__])
        with Session(self.engine) as db:
            company = Company(slug="acme", name="Acme", segment="Retail")
            other = Company(slug="other", name="Other", segment="Retail")
            db.add_all([company, other])
            db.flush()
            analysis = AnalysisRun(company_id=company.id, reference_date=date(2026, 10, 8))
            foreign = AnalysisRun(company_id=other.id, reference_date=date(2026, 10, 8))
            db.add_all([analysis, foreign])
            db.commit()
            self.company_id, self.other_id = company.id, other.id
            self.analysis_id, self.foreign_id = analysis.id, foreign.id
        self.app = create_app()
        def test_db():
            with Session(self.engine) as db:
                yield db
        self.app.dependency_overrides[get_db] = test_db
        self.client = TestClient(self.app)
        self.client.__enter__()
        self.url = f"/api/v1/companies/{self.company_id}/risks"
        self.other_url = f"/api/v1/companies/{self.other_id}/risks"

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.app.dependency_overrides.clear()
        self.engine.dispose()

    def payload(self, **changes):
        data = dict(title="Cash flow", category="Financeiro", description="Description",
                    detail="Detail", cause="Cause", probability="50.25", impact_amount="123.45",
                    deadline_description="Next month", status="Ativo", severity="critico",
                    recommendations=["Review expenses", "Call supplier", "Review expenses"])
        data.update(changes)
        return data

    def create(self, **changes):
        response = self.client.post(self.url, json=self.payload(**changes))
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_create_get_list_and_recommendation_order(self):
        created = self.create(analysis_run_id=str(self.analysis_id), deadline_at="2026-11-01T10:00:00Z")
        self.assertEqual(created["analysis_run_id"], str(self.analysis_id))
        self.assertEqual(Decimal(created["probability"]), Decimal("50.25"))
        self.assertEqual(Decimal(created["impact_amount"]), Decimal("123.45"))
        self.assertEqual(created["company_id"], str(self.company_id))
        fetched = self.client.get(self.url+"/"+created["id"])
        self.assertEqual(fetched.status_code, 200)
        listed = self.client.get(self.url)
        self.assertEqual(listed.status_code, 200)
        for risk in [created, fetched.json(), listed.json()[0]]:
            self.assertEqual([r["text"] for r in risk["recommendations"]], self.payload()["recommendations"])
            self.assertEqual([r["position"] for r in risk["recommendations"]], [0, 1, 2])
            self.assertEqual(len({r["id"] for r in risk["recommendations"]}), 3)
        self.assertEqual(self.client.get(self.other_url).json(), [])
        self.assertEqual(self.client.get(self.other_url+"/"+created["id"]).status_code, 404)

    def test_analysis_and_missing_resources(self):
        for analysis_id, expected in [(uuid4(),404),(self.foreign_id,422)]:
            response = self.client.post(self.url,json=self.payload(analysis_run_id=str(analysis_id)))
            self.assertEqual(response.status_code,expected,response.text)
        missing_url = f"/api/v1/companies/{uuid4()}/risks"
        self.assertEqual(self.client.post(missing_url,json=self.payload()).status_code,404)
        self.assertEqual(self.client.get(missing_url).status_code,404)
        self.assertEqual(self.client.get(missing_url+"/"+str(uuid4())).status_code,404)
        self.assertEqual(self.client.get(self.url+"/"+str(uuid4())).status_code,404)
        self.assertEqual(self.client.get(self.url).json(),[])

    def test_filters_combination_and_pagination(self):
        first=self.create()
        second=self.create(category="Estoque",severity="normal",status="Monitorando")
        third=self.create(category="Financeiro",severity="normal",status="Ativo")
        self.client.post(self.other_url,json=self.payload())
        cases=[({"category":"Financeiro"},{first['id'],third['id']}),
               ({"severity":"normal"},{second['id'],third['id']}),
               ({"status":"Monitorando"},{second['id']}),
               ({"category":"Financeiro","severity":"normal","status":"Ativo"},{third['id']}),
               ({"category":"Estoque","severity":"critico"},set())]
        for params,expected in cases:
            response=self.client.get(self.url,params=params)
            self.assertEqual(response.status_code,200)
            self.assertEqual({r['id'] for r in response.json()},expected)
        all_risks=self.client.get(self.url).json()
        self.assertEqual(self.client.get(self.url,params={"offset":1,"limit":1}).json(),all_risks[1:2])

    def test_invalid_inputs_and_filters(self):
        invalid=[{"probability":"-0.01"},{"probability":"100.01"},{"probability":"1.001"},
                 {"probability":"NaN"},{"impact_amount":"-1"},{"impact_amount":"Infinity"},
                 {"impact_amount":"10000000000000000"},{"impact_amount":"1.001"},
                 {"category":"bad"},{"severity":"bad"},{"status":"bad"},
                 {"title":" "},{"title":"x"*201},{"recommendations":[" "]},
                 {"recommendations":"text"},{"recommendations":[{"text":"wrong shape"}]},
                 {"recommendations":None},{"company_id":str(self.other_id)},
                 {"analysis_run_id":"bad"},{"deadline_at":"bad"}]
        for changes in invalid:
            with self.subTest(changes=changes):
                response=self.client.post(self.url,json=self.payload(**changes))
                self.assertEqual(response.status_code,422,response.text)
        for params in [{"category":"bad"},{"severity":"bad"},{"status":"bad"},{"offset":-1},{"limit":101}]:
            self.assertEqual(self.client.get(self.url,params=params).status_code,422)
        self.assertEqual(self.client.get(self.url+"/bad").status_code,422)
        self.assertEqual(self.client.get('/api/v1/companies/bad/risks').status_code,422)
        self.assertEqual(self.client.get(self.url).json(),[])

    def test_boundaries_optional_fields_and_empty_recommendations(self):
        for probability in ["0","100"]:
            risk=self.create(probability=probability,impact_amount="0",recommendations=[])
            self.assertIsNone(risk['analysis_run_id'])
            self.assertIsNone(risk['deadline_at'])
            self.assertEqual(risk['recommendations'],[])
        body=self.payload()
        del body['recommendations']
        self.assertEqual(self.client.post(self.url,json=body).json()['recommendations'],[])

    def test_atomic_rollback(self):
        def fail_after_insert(repository,risk):
            repository.db.add(risk)
            repository.db.flush()
            raise IntegrityError("insert",{},Exception("controlled failure"))
        with patch('app.services.risk_service.RiskRepository.add',autospec=True,side_effect=fail_after_insert):
            self.assertEqual(self.client.post(self.url,json=self.payload()).status_code,409)
        with Session(self.engine) as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(Risk)),0)
            self.assertEqual(db.scalar(select(func.count()).select_from(RiskRecommendation)),0)
        self.create()

    def test_imports_and_openapi(self):
        for layer,module in [('schemas','risk'),('repositories','risk_repository'),('services','risk_service'),('routes','risks')]:
            importlib.import_module(f'app.{layer}.{module}')
        response=self.client.get('/openapi.json')
        self.assertEqual(response.status_code,200)
        schema=response.json()
        collection=schema['paths']['/api/v1/companies/{company_id}/risks']
        self.assertEqual(set(collection),{'post','get'})
        self.assertEqual(set(schema['paths']['/api/v1/companies/{company_id}/risks/{risk_id}']),{'get'})
        self.assertTrue({'category','severity','status'} <= {p['name'] for p in collection['get']['parameters']})
        self.assertEqual(schema['components']['schemas']['RiskCreate']['properties']['recommendations']['type'],'array')


if __name__ == '__main__':
    unittest.main()
