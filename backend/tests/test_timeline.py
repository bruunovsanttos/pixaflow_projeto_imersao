"""Timeline integration tests: disposable SQLite, never the configured PostgreSQL."""
import importlib
import os
import unittest
from datetime import date
from unittest.mock import patch
from uuid import uuid4

os.environ["DATABASE_URL"] = "postgresql+psycopg://test:test@127.0.0.1:1/timeline_tests"

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
from app.models.timeline import TimelineEvent, TimelineEventRecommendation


class TimelineTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(self.engine, tables=[Company.__table__, AnalysisRun.__table__, TimelineEvent.__table__, TimelineEventRecommendation.__table__])
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
        self.url = f"/api/v1/companies/{self.company_id}/timeline-events"
        self.other_url = f"/api/v1/companies/{self.other_id}/timeline-events"

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.app.dependency_overrides.clear()
        self.engine.dispose()

    def payload(self, **changes):
        data = dict(event_date="2026-10-08", title="Stock review", severity="critico",
                    description="Description", cause="Cause", impact_description="Impact",
                    recommendations=["Review stock", "Call supplier", "Review stock"])
        data.update(changes)
        return data

    def create(self, **changes):
        response = self.client.post(self.url, json=self.payload(**changes))
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_create_get_list_and_recommendation_order(self):
        created = self.create(analysis_run_id=str(self.analysis_id))
        self.assertEqual(created['analysis_run_id'], str(self.analysis_id))
        self.assertEqual(created['company_id'], str(self.company_id))
        self.assertEqual(created['event_date'], '2026-10-08')
        fetched = self.client.get(self.url+'/'+created['id'])
        listed = self.client.get(self.url)
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(listed.status_code, 200)
        for item in [created, fetched.json(), listed.json()[0]]:
            self.assertEqual([r['text'] for r in item['recommendations']], self.payload()['recommendations'])
            self.assertEqual([r['position'] for r in item['recommendations']], [0,1,2])
            self.assertEqual(len({r['id'] for r in item['recommendations']}), 3)

    def test_company_isolation_and_analysis_validation(self):
        created=self.create()
        self.assertEqual(self.client.get(self.other_url).json(),[])
        self.assertEqual(self.client.get(self.other_url+'/'+created['id']).status_code,404)
        response=self.client.post(self.other_url,json=self.payload())
        self.assertEqual(response.status_code,201)
        self.assertEqual(len(self.client.get(self.url).json()),1)
        for analysis_id,expected in [(uuid4(),404),(self.foreign_id,422)]:
            response=self.client.post(self.url,json=self.payload(analysis_run_id=str(analysis_id)))
            self.assertEqual(response.status_code,expected,response.text)
        self.assertEqual(len(self.client.get(self.url).json()),1)

    def test_missing_resources(self):
        missing=f'/api/v1/companies/{uuid4()}/timeline-events'
        self.assertEqual(self.client.post(missing,json=self.payload()).status_code,404)
        self.assertEqual(self.client.get(missing).status_code,404)
        self.assertEqual(self.client.get(missing+'/'+str(uuid4())).status_code,404)
        self.assertEqual(self.client.get(self.url+'/'+str(uuid4())).status_code,404)

    def test_severity_dates_combined_filters_and_pagination(self):
        last=self.create(event_date='2026-10-10',severity='normal')
        first=self.create(event_date='2026-10-01',severity='critico')
        middle=self.create(event_date='2026-10-05',severity='critico')
        self.assertEqual(self.client.post(self.other_url,json=self.payload(event_date='2026-10-05')).status_code,201)
        cases=[({'severity':'critico'},[first['id'],middle['id']]),
               ({'data_inicio':'2026-10-05'},[middle['id'],last['id']]),
               ({'data_fim':'2026-10-05'},[first['id'],middle['id']]),
               ({'data_inicio':'2026-10-01','data_fim':'2026-10-10'},[first['id'],middle['id'],last['id']]),
               ({'data_inicio':'2026-10-05','data_fim':'2026-10-05'},[middle['id']]),
               ({'severity':'critico','data_inicio':'2026-10-05','data_fim':'2026-10-10'},[middle['id']]),
               ({'severity':'normal','data_fim':'2026-10-05'},[])]
        for params,expected in cases:
            with self.subTest(params=params):
                response=self.client.get(self.url,params=params)
                self.assertEqual(response.status_code,200,response.text)
                self.assertEqual([e['id'] for e in response.json()],expected)
        self.assertEqual(self.client.get(self.url,params={'offset':1,'limit':1}).json(),[middle])
        self.assertEqual(self.client.get(self.url,params={'offset':20}).json(),[])

    def test_invalid_inputs_and_date_ranges(self):
        cases=[{'event_date':'2026-02-30'},{'event_date':'not-a-date'},{'event_date':None},
               {'severity':'invalid'},{'title':' '},{'title':'x'*201},{'description':' '},
               {'cause':' '},{'impact_description':' '},{'analysis_run_id':'bad'},
               {'recommendations':[' ']},{'recommendations':None},{'recommendations':'text'},
               {'recommendations':[{'text':'wrong shape'}]},{'company_id':str(self.other_id)}]
        for changes in cases:
            with self.subTest(changes=changes):
                response=self.client.post(self.url,json=self.payload(**changes))
                self.assertEqual(response.status_code,422,response.text)
        for params in [{'data_inicio':'2026-10-10','data_fim':'2026-10-01'},
                       {'data_inicio':'bad'},{'data_fim':'2026-02-30'},{'severity':'bad'},
                       {'offset':-1},{'limit':0},{'limit':101}]:
            response=self.client.get(self.url,params=params)
            self.assertEqual(response.status_code,422,response.text)
        self.assertEqual(self.client.get(self.url+'/bad').status_code,422)
        self.assertEqual(self.client.get('/api/v1/companies/bad/timeline-events').status_code,422)
        self.assertEqual(self.client.get(self.url).json(),[])

    def test_optional_fields_empty_recommendations_and_leap_day(self):
        created=self.create(event_date='2028-02-29',recommendations=[])
        self.assertEqual(created['event_date'],'2028-02-29')
        self.assertIsNone(created['analysis_run_id'])
        self.assertEqual(created['recommendations'],[])
        body=self.payload()
        del body['recommendations']
        response=self.client.post(self.url,json=body)
        self.assertEqual(response.status_code,201)
        self.assertEqual(response.json()['recommendations'],[])

    def test_atomic_rollback(self):
        def fail_after_insert(repository,event):
            repository.db.add(event)
            repository.db.flush()
            raise IntegrityError('insert',{},Exception('controlled failure'))
        with patch('app.services.timeline_service.TimelineRepository.add',autospec=True,side_effect=fail_after_insert):
            self.assertEqual(self.client.post(self.url,json=self.payload()).status_code,409)
        with Session(self.engine) as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(TimelineEvent)),0)
            self.assertEqual(db.scalar(select(func.count()).select_from(TimelineEventRecommendation)),0)
        self.create()

    def test_imports_and_openapi(self):
        for layer,module in [('schemas','timeline'),('repositories','timeline_repository'),('services','timeline_service'),('routes','timeline_events')]:
            importlib.import_module(f'app.{layer}.{module}')
        response=self.client.get('/openapi.json')
        self.assertEqual(response.status_code,200)
        schema=response.json()
        collection=schema['paths']['/api/v1/companies/{company_id}/timeline-events']
        self.assertEqual(set(collection),{'post','get'})
        self.assertEqual(set(schema['paths']['/api/v1/companies/{company_id}/timeline-events/{event_id}']),{'get'})
        self.assertTrue({'severity','data_inicio','data_fim','offset','limit'} <= {p['name'] for p in collection['get']['parameters']})
        fields=schema['components']['schemas']['TimelineEventCreate']['properties']
        self.assertEqual(fields['event_date']['format'],'date')
        self.assertEqual(fields['recommendations']['type'],'array')


if __name__ == '__main__':
    unittest.main()
