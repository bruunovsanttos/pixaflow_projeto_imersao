"""Opportunity HTTP tests with a disposable SQLite database only."""
import importlib
import os
import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

os.environ["DATABASE_URL"] = "postgresql+psycopg://test:test@127.0.0.1:1/opportunity_tests"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.database.session import get_db
from app.main import create_app
from app.models.analysis import AnalysisRun
from app.models.enums import EffortLevel
from app.models.identity import Company
from app.models.opportunity import Opportunity


class OpportunityTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(self.engine, tables=[Company.__table__, AnalysisRun.__table__, Opportunity.__table__])
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
        self.url = f"/api/v1/companies/{self.company_id}/opportunities"
        self.other_url = f"/api/v1/companies/{self.other_id}/opportunities"

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.app.dependency_overrides.clear()
        self.engine.dispose()

    def payload(self, **changes):
        data = dict(title="Campaign", description="Increase sales", action="Launch campaign",
                    benefit_type="revenue", potential_amount="200.00", cost_amount="100.00",
                    extra_clients=10, effort="Baixo", horizon_days=7, confidence="85.25")
        data.update(changes)
        return data

    def create(self, **changes):
        response = self.client.post(self.url, json=self.payload(**changes))
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_create_get_list_and_company_isolation(self):
        created = self.create(analysis_run_id=str(self.analysis_id))
        self.assertEqual(created['analysis_run_id'], str(self.analysis_id))
        self.assertEqual(created['company_id'], str(self.company_id))
        self.assertEqual(Decimal(created['confidence']), Decimal('85.25'))
        self.assertEqual(self.client.get(self.url+'/'+created['id']).json(), created)
        self.assertEqual(self.client.get(self.url).json(), [created])
        self.assertEqual(self.client.get(self.other_url).json(), [])
        self.assertEqual(self.client.get(self.other_url+'/'+created['id']).status_code, 404)
        self.assertIsNone(self.create()['analysis_run_id'])

    def test_roi_positive_negative_zero_and_zero_cost(self):
        for potential, cost, expected in [('200','100','100'),('50','100','-50'),('100','100','0'),('100','0',None),('0','0',None)]:
            with self.subTest(potential=potential,cost=cost):
                created=self.create(potential_amount=potential,cost_amount=cost)
                fetched=self.client.get(self.url+'/'+created['id']).json()
                listed=next(o for o in self.client.get(self.url).json() if o['id']==created['id'])
                for result in [created,fetched,listed]:
                    if expected is None:
                        self.assertIsNone(result['roi'])
                    else:
                        self.assertEqual(Decimal(result['roi']),Decimal(expected))
        self.assertNotIn('roi', {c['name'] for c in inspect(self.engine).get_columns('opportunities')})

    def test_analysis_and_missing_resources(self):
        for analysis_id,expected in [(uuid4(),404),(self.foreign_id,422)]:
            response=self.client.post(self.url,json=self.payload(analysis_run_id=str(analysis_id)))
            self.assertEqual(response.status_code,expected,response.text)
        missing=f'/api/v1/companies/{uuid4()}/opportunities'
        self.assertEqual(self.client.post(missing,json=self.payload()).status_code,404)
        self.assertEqual(self.client.get(missing).status_code,404)
        self.assertEqual(self.client.get(missing+'/'+str(uuid4())).status_code,404)
        self.assertEqual(self.client.get(self.url+'/'+str(uuid4())).status_code,404)
        self.assertEqual(self.client.get(self.url).json(),[])

    def test_filters_and_pagination(self):
        first=self.create()
        second=self.create(effort='Alto',benefit_type='cost_saving')
        third=self.create(effort='Alto')
        response=self.client.post(self.other_url,json=self.payload())
        self.assertEqual(response.status_code,201)
        for params,expected in [({'effort':'Baixo'},{first['id']}),
                                ({'benefit_type':'revenue'},{first['id'],third['id']}),
                                ({'effort':'Alto','benefit_type':'cost_saving'},{second['id']}),
                                ({'effort':'Baixo','benefit_type':'cost_saving'},set())]:
            response=self.client.get(self.url,params=params)
            self.assertEqual(response.status_code,200)
            self.assertEqual({o['id'] for o in response.json()},expected)
        all_items=self.client.get(self.url).json()
        self.assertEqual(len(all_items),3)
        self.assertEqual(self.client.get(self.url,params={'offset':1,'limit':1}).json(),all_items[1:2])
        self.assertEqual(self.client.get(self.url,params={'offset':10}).json(),[])

    def test_invalid_inputs(self):
        cases=[{'potential_amount':'-1'},{'cost_amount':'-1'},{'extra_clients':-1},
               {'extra_clients':1.5},{'extra_clients':True},{'extra_clients':2147483648},
               {'horizon_days':0},{'horizon_days':-1},{'horizon_days':1.5},{'horizon_days':2147483648},
               {'confidence':'-0.01'},{'confidence':'100.01'},{'confidence':'NaN'},
               {'confidence':'1.001'},{'potential_amount':'Infinity'},{'cost_amount':'NaN'},
               {'potential_amount':'10000000000000000'},{'cost_amount':'10000000000000000'},
               {'potential_amount':'1.001'},{'cost_amount':'1.001'},
               {'benefit_type':'invalid'},{'effort':'invalid'},{'title':' '},{'title':'x'*201},
               {'description':' '},{'action':' '},{'roi':123},{'company_id':str(self.other_id)},
               {'analysis_run_id':'invalid'},{'cost_amount':None}]
        for changes in cases:
            with self.subTest(changes=changes):
                response=self.client.post(self.url,json=self.payload(**changes))
                self.assertEqual(response.status_code,422,response.text)
        for params in [{'effort':'bad'},{'benefit_type':'bad'},{'offset':-1},{'limit':0},{'limit':101}]:
            self.assertEqual(self.client.get(self.url,params=params).status_code,422)
        self.assertEqual(self.client.get(self.url+'/invalid').status_code,422)
        self.assertEqual(self.client.get('/api/v1/companies/invalid/opportunities').status_code,422)
        self.assertEqual(self.client.get(self.url).json(),[])

    def test_valid_boundaries_and_enums(self):
        for confidence in ['0','100']:
            for effort in EffortLevel:
                created=self.create(confidence=confidence,extra_clients=0,horizon_days=1,
                                    potential_amount='0',cost_amount='0',effort=effort.value,
                                    benefit_type='cost_saving')
                self.assertEqual(created['effort'],effort.value)
                self.assertEqual(Decimal(created['confidence']),Decimal(confidence))
                self.assertIsNone(created['roi'])

    def test_atomic_rollback(self):
        def fail_after_insert(repository,opportunity):
            repository.db.add(opportunity)
            repository.db.flush()
            raise IntegrityError('insert',{},Exception('controlled failure'))
        with patch('app.services.opportunity_service.OpportunityRepository.add',autospec=True,side_effect=fail_after_insert):
            self.assertEqual(self.client.post(self.url,json=self.payload()).status_code,409)
        with Session(self.engine) as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(Opportunity)),0)
        self.create()

    def test_imports_and_openapi(self):
        for layer,module in [('schemas','opportunity'),('repositories','opportunity_repository'),('services','opportunity_service'),('routes','opportunities')]:
            importlib.import_module(f'app.{layer}.{module}')
        response=self.client.get('/openapi.json')
        self.assertEqual(response.status_code,200)
        schema=response.json()
        collection=schema['paths']['/api/v1/companies/{company_id}/opportunities']
        self.assertEqual(set(collection),{'post','get'})
        self.assertEqual(set(schema['paths']['/api/v1/companies/{company_id}/opportunities/{opportunity_id}']),{'get'})
        self.assertTrue({'effort','benefit_type','offset','limit'} <= {p['name'] for p in collection['get']['parameters']})
        self.assertNotIn('roi',schema['components']['schemas']['OpportunityCreate']['properties'])
        roi=schema['components']['schemas']['OpportunityResponse']['properties']['roi']
        self.assertIn({'type':'null'},roi['anyOf'])


if __name__ == '__main__':
    unittest.main()
