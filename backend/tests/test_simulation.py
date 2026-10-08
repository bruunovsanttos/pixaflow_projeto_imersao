"""Simulation HTTP integration tests, isolated from PostgreSQL."""
import importlib
import os
import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import patch
from uuid import UUID, uuid4

os.environ["DATABASE_URL"] = "postgresql+psycopg://test:test@127.0.0.1:1/simulation_tests"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.database.session import get_db
from app.main import create_app
from app.models.analysis import AnalysisRun
from app.models.enums import BenefitType, EffortLevel, SimulationVariant, DecisionKind
from app.models.identity import Company, User, CompanyMembership
from app.models.opportunity import Opportunity
from app.models.simulation import SimulationRun, SimulationMetrics, SimulationRecommendation


class SimulationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        @event.listens_for(self.engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        tables=[Company,User,CompanyMembership,AnalysisRun,Opportunity,SimulationRun,SimulationMetrics,SimulationRecommendation]
        Base.metadata.create_all(self.engine,tables=[m.__table__ for m in tables])
        with Session(self.engine) as db:
            user=User(name='Ana',email='ana@example.com')
            db.add(user)
            db.flush()
            self.fixtures=[]
            for slug in ['acme','other']:
                company=Company(slug=slug,name=slug,segment='Retail')
                db.add(company)
                db.flush()
                member=CompanyMembership(company_id=company.id,user_id=user.id,job_title='Manager')
                analysis=AnalysisRun(company_id=company.id,reference_date=date(2026,10,8))
                opportunity=Opportunity(company_id=company.id,title='Campaign',description='Description',
                    action='Action',benefit_type=BenefitType.REVENUE,potential_amount=200,cost_amount=100,
                    extra_clients=10,effort=EffortLevel.LOW,horizon_days=7,confidence=80)
                db.add_all([member,analysis,opportunity])
                db.flush()
                self.fixtures.append(dict(company=company.id,member=member.id,analysis=analysis.id,opportunity=opportunity.id))
            db.commit()
        self.own,self.other=self.fixtures
        self.url=f"/api/v1/companies/{self.own['company']}/simulations"
        self.other_url=f"/api/v1/companies/{self.other['company']}/simulations"
        self.app=create_app()
        def test_db():
            with Session(self.engine) as db:
                yield db
        self.app.dependency_overrides[get_db]=test_db
        self.client=TestClient(self.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None,None,None)
        self.app.dependency_overrides.clear()
        self.engine.dispose()

    def payload(self,**changes):
        data=dict(decision_kind='marketing',amount=10,question='What happens?',reference_date='2026-10-08',
                  horizon_days=7,model_version='test-v1',assumption='Supplied results',additional_cost='20.00',
                  initial_capital='100.00',incremental_balance='-25.50',created_by_membership_id=str(self.own['member']),
                  baseline=dict(investment='0',clients=10,revenue='100.25',capacity='90'),
                  simulated=dict(investment='25',clients=20,revenue='120.50',capacity='150.25'),
                  recommendations=['Review cash','Contact supplier','Review cash'])
        data.update(changes)
        return data

    def create(self,**changes):
        response=self.client.post(self.url,json=self.payload(**changes))
        self.assertEqual(response.status_code,201,response.text)
        return response.json()

    def counts(self):
        with Session(self.engine) as db:
            return [db.scalar(select(func.count()).select_from(model)) for model in [SimulationRun,SimulationMetrics,SimulationRecommendation]]

    def test_create_get_metrics_and_recommendation_order(self):
        created=self.create(analysis_run_id=str(self.own['analysis']))
        response=self.client.get(self.url+'/'+created['id'])
        self.assertEqual(response.status_code,200)
        for result in [created,response.json()]:
            self.assertEqual(result['created_by_membership_id'],str(self.own['member']))
            self.assertEqual(result['analysis_run_id'],str(self.own['analysis']))
            self.assertEqual(Decimal(result['incremental_balance']),Decimal('-25.50'))
            self.assertEqual(len(result['metrics']),2)
            metrics={m['variant']:m for m in result['metrics']}
            self.assertEqual(set(metrics),{'baseline','simulated'})
            for variant in metrics:
                for field,value in self.payload()[variant].items():
                    self.assertEqual(Decimal(str(metrics[variant][field])),Decimal(str(value)))
            self.assertEqual([r['text'] for r in result['recommendations']],self.payload()['recommendations'])
            self.assertEqual([r['position'] for r in result['recommendations']],[0,1,2])
        self.assertEqual(self.counts(),[1,2,3])

    def test_membership_analysis_and_company_isolation(self):
        for field,key in [('created_by_membership_id','member'),('analysis_run_id','analysis')]:
            for value,expected in [(uuid4(),404),(self.other[key],422)]:
                response=self.client.post(self.url,json=self.payload(**{field:str(value)}))
                self.assertEqual(response.status_code,expected,response.text)
        self.assertEqual(self.counts(),[0,0,0])
        created=self.create()
        self.assertEqual(self.client.get(self.other_url+'/'+created['id']).status_code,404)
        missing=f'/api/v1/companies/{uuid4()}/simulations'
        self.assertEqual(self.client.post(missing,json=self.payload()).status_code,404)
        self.assertEqual(self.client.get(missing+'/'+created['id']).status_code,404)
        self.assertEqual(self.client.get(self.url+'/'+str(uuid4())).status_code,404)

    def test_opportunity_rules(self):
        for value,expected in [(None,422),(str(uuid4()),404),(str(self.other['opportunity']),422)]:
            response=self.client.post(self.url,json=self.payload(decision_kind='opportunity',opportunity_id=value))
            self.assertEqual(response.status_code,expected,response.text)
        for kind in DecisionKind:
            if kind != DecisionKind.OPPORTUNITY:
                response=self.client.post(self.url,json=self.payload(decision_kind=kind.value,opportunity_id=str(self.own['opportunity'])))
                self.assertEqual(response.status_code,422)
        self.assertEqual(self.counts(),[0,0,0])
        created=self.create(decision_kind='opportunity',opportunity_id=str(self.own['opportunity']))
        self.assertEqual(created['opportunity_id'],str(self.own['opportunity']))

    def test_exactly_two_variants_and_no_duplicate(self):
        for field in ['baseline','simulated']:
            body=self.payload()
            del body[field]
            self.assertEqual(self.client.post(self.url,json=body).status_code,422)
            body=self.payload(**{field:None})
            self.assertEqual(self.client.post(self.url,json=body).status_code,422)
        body=self.payload()
        body['baseline']['variant']='simulated'
        self.assertEqual(self.client.post(self.url,json=body).status_code,422)
        self.assertEqual(self.client.post(self.url,json=self.payload(metrics=[])).status_code,422)
        created=self.create()
        with Session(self.engine) as db:
            db.add(SimulationMetrics(simulation_id=UUID(created['id']),variant=SimulationVariant.BASELINE,
                                     investment=0,clients=0,revenue=0,capacity=0))
            with self.assertRaises(IntegrityError):
                db.commit()
            db.rollback()
        self.assertEqual(self.counts(),[1,2,3])

    def test_invalid_inputs(self):
        changes=[{'amount':-1},{'amount':1.5},{'amount':2147483648},{'horizon_days':0},
                 {'additional_cost':'-1'},{'initial_capital':'-1'},{'incremental_balance':'NaN'},
                 {'additional_cost':'1.001'},{'initial_capital':'10000000000000000'},
                 {'decision_kind':'invalid'},{'reference_date':'2026-02-30'},
                 {'model_version':' '},{'question':'x'*2001},{'assumption':' '},
                 {'recommendations':[' ']},{'recommendations':None},{'created_by_membership_id':'bad'},
                 {'company_id':str(self.other['company'])}]
        for change in changes:
            with self.subTest(change=change):
                response=self.client.post(self.url,json=self.payload(**change))
                self.assertEqual(response.status_code,422,response.text)
        for variant in ['baseline','simulated']:
            for field,value in [('investment','-1'),('clients',-1),('clients',1.5),('revenue','-1'),
                                ('capacity','-1'),('capacity','100000000'),('capacity','1.001')]:
                body=self.payload()
                body[variant][field]=value
                self.assertEqual(self.client.post(self.url,json=body).status_code,422)
        self.assertEqual(self.counts(),[0,0,0])

    def test_zero_values_and_optional_fields(self):
        metrics=dict(investment='0',clients=0,revenue='0',capacity='0')
        created=self.create(amount=0,additional_cost='0',initial_capital='0',incremental_balance='0',
                            horizon_days=1,baseline=metrics,simulated=metrics,recommendations=[])
        self.assertIsNone(created['analysis_run_id'])
        self.assertIsNone(created['opportunity_id'])
        self.assertEqual(created['recommendations'],[])
        self.assertEqual(len(created['metrics']),2)

    def test_atomic_rollback(self):
        def fail_after_insert(repository,simulation):
            repository.db.add(simulation)
            repository.db.flush()
            # All three kinds of row existed before the controlled failure.
            for model,count in [(SimulationRun,1),(SimulationMetrics,2),(SimulationRecommendation,3)]:
                self.assertEqual(repository.db.scalar(select(func.count()).select_from(model)),count)
            raise IntegrityError('insert',{},Exception('controlled failure'))
        with patch('app.services.simulation_service.SimulationRepository.add',autospec=True,side_effect=fail_after_insert):
            self.assertEqual(self.client.post(self.url,json=self.payload()).status_code,409)
        self.assertEqual(self.counts(),[0,0,0])
        self.create()
        self.assertEqual(self.counts(),[1,2,3])

    def test_imports_and_openapi(self):
        for layer,module in [('schemas','simulation'),('repositories','simulation_repository'),('services','simulation_service'),('routes','simulations')]:
            importlib.import_module(f'app.{layer}.{module}')
        response=self.client.get('/openapi.json')
        self.assertEqual(response.status_code,200)
        schema=response.json()
        self.assertEqual(set(schema['paths']['/api/v1/companies/{company_id}/simulations']),{'post'})
        self.assertEqual(set(schema['paths']['/api/v1/companies/{company_id}/simulations/{simulation_id}']),{'get'})
        required=schema['components']['schemas']['SimulationCreate']['required']
        self.assertTrue({'baseline','simulated','created_by_membership_id'} <= set(required))


if __name__ == '__main__':
    unittest.main()
