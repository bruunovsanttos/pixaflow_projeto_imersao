"""SavedScenario HTTP integration tests, isolated from PostgreSQL."""
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
from app.models.saved_scenario import SavedScenario


class SavedScenarioTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        @event.listens_for(self.engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        tables=[Company,User,CompanyMembership,AnalysisRun,Opportunity,SimulationRun,SimulationMetrics,SimulationRecommendation,SavedScenario]
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

    def create_simulation(self,**changes):
        response=self.client.post(self.url,json=self.payload(**changes))
        self.assertEqual(response.status_code,201,response.text)
        return response.json()

    def saved_url(self, company=None):
        return f"/api/v1/companies/{company or self.own['company']}/saved-scenarios"

    def save(self, simulation_id, membership_id=None):
        response=self.client.post(self.saved_url(),json={
            'membership_id':str(membership_id or self.own['member']), 'simulation_id':simulation_id,
        })
        self.assertEqual(response.status_code,201,response.text)
        return response.json()

    def test_create_get_list_delete_preserves_simulation(self):
        simulation=self.create_simulation()
        before=self.client.get(self.url+'/'+simulation['id']).json()
        saved=self.save(simulation['id'])
        self.assertEqual(saved['simulation_id'],simulation['id'])
        self.assertEqual(saved['membership_id'],str(self.own['member']))
        url=self.saved_url()+'/'+saved['id']
        self.assertEqual(self.client.get(url).json(),saved)
        self.assertEqual(self.client.get(self.saved_url()).json(),[saved])
        deleted=self.client.delete(url)
        self.assertEqual(deleted.status_code,204)
        self.assertEqual(deleted.content,b'')
        self.assertEqual(self.client.get(url).status_code,404)
        self.assertEqual(self.client.delete(url).status_code,404)
        self.assertEqual(self.client.get(self.saved_url()).json(),[])
        after=self.client.get(self.url+'/'+simulation['id'])
        self.assertEqual(after.status_code,200)
        self.assertEqual(after.json(),before)
        with Session(self.engine) as db:
            for model,expected in [(SimulationRun,1),(SimulationMetrics,2),(SimulationRecommendation,3),(SavedScenario,0)]:
                self.assertEqual(db.scalar(select(func.count()).select_from(model)),expected)
        self.save(simulation['id'])

    def test_duplicate_and_database_race_guard(self):
        simulation=self.create_simulation()
        self.save(simulation['id'])
        payload=dict(membership_id=str(self.own['member']),simulation_id=simulation['id'])
        self.assertEqual(self.client.post(self.saved_url(),json=payload).status_code,409)
        # Bypass the precheck to exercise the real unique constraint and rollback.
        with patch('app.services.saved_scenario_service.SavedScenarioRepository.get_by_pair',return_value=None):
            self.assertEqual(self.client.post(self.saved_url(),json=payload).status_code,409)
        self.assertEqual(len(self.client.get(self.saved_url()).json()),1)

    def test_cross_company_relationships_and_isolation(self):
        simulation=self.create_simulation()
        saved=self.save(simulation['id'])
        response=self.client.post(self.other_url,json=self.payload(created_by_membership_id=str(self.other['member'])))
        self.assertEqual(response.status_code,201)
        foreign_simulation=response.json()
        for membership,sim_id in [(self.other['member'],simulation['id']),(self.own['member'],foreign_simulation['id'])]:
            response=self.client.post(self.saved_url(),json={'membership_id':str(membership),'simulation_id':sim_id})
            self.assertEqual(response.status_code,422,response.text)
        foreign_saved=self.client.post(self.saved_url(self.other['company']),json={
            'membership_id':str(self.other['member']),'simulation_id':foreign_simulation['id'],
        })
        self.assertEqual(foreign_saved.status_code,201)
        self.assertEqual(self.client.get(self.saved_url()).json(),[saved])
        other_url=self.saved_url(self.other['company'])+'/'+saved['id']
        self.assertEqual(self.client.get(other_url).status_code,404)
        self.assertEqual(self.client.delete(other_url).status_code,404)
        self.assertEqual(self.client.get(self.saved_url()+'/'+saved['id']).status_code,200)
        self.assertEqual(self.client.get(self.saved_url(),params={'membership_id':str(self.other['member'])}).status_code,422)

    def test_membership_filter_and_pagination(self):
        with Session(self.engine) as db:
            user=User(name='Bob',email='bob@example.com')
            db.add(user)
            db.flush()
            member=CompanyMembership(company_id=self.own['company'],user_id=user.id,job_title='Analyst')
            db.add(member)
            db.commit()
            second_member=member.id
        first=self.create_simulation()
        second=self.create_simulation()
        self.save(first['id'])
        self.save(second['id'])
        shared=self.save(first['id'],second_member)
        self.assertEqual(self.client.get(self.saved_url(),params={'membership_id':str(second_member)}).json(),[shared])
        all_items=self.client.get(self.saved_url()).json()
        self.assertEqual(len(all_items),3)
        self.assertEqual(self.client.get(self.saved_url(),params={'offset':1,'limit':1}).json(),all_items[1:2])
        self.assertEqual(self.client.get(self.saved_url(),params={'offset':10}).json(),[])
        filtered=self.client.get(self.saved_url(),params={'membership_id':str(self.own['member'])}).json()
        self.assertEqual(len(filtered),2)
        self.assertEqual(self.client.get(self.saved_url(),params={'membership_id':str(self.own['member']),'offset':1,'limit':1}).json(),filtered[1:2])
        self.client.delete(self.saved_url()+'/'+shared['id'])
        self.assertEqual(len(self.client.get(self.saved_url()).json()),2)

    def test_missing_resources(self):
        simulation=self.create_simulation()
        for membership,sim_id in [(uuid4(),simulation['id']),(self.own['member'],str(uuid4()))]:
            response=self.client.post(self.saved_url(),json={'membership_id':str(membership),'simulation_id':sim_id})
            self.assertEqual(response.status_code,404)
        missing_company=self.saved_url(uuid4())
        self.assertEqual(self.client.post(missing_company,json={'membership_id':str(self.own['member']),'simulation_id':simulation['id']}).status_code,404)
        self.assertEqual(self.client.get(missing_company).status_code,404)
        for collection in [missing_company,self.saved_url()]:
            self.assertEqual(self.client.get(collection+'/'+str(uuid4())).status_code,404)
            self.assertEqual(self.client.delete(collection+'/'+str(uuid4())).status_code,404)
        self.assertEqual(self.client.get(self.saved_url(),params={'membership_id':str(uuid4())}).status_code,404)

    def test_invalid_inputs(self):
        for body in [{},{'membership_id':'bad','simulation_id':str(uuid4())},
                     {'membership_id':str(self.own['member']),'simulation_id':'bad'},
                     {'membership_id':str(self.own['member']),'simulation_id':str(uuid4()),'company_id':str(self.own['company'])}]:
            self.assertEqual(self.client.post(self.saved_url(),json=body).status_code,422)
        for params in [{'membership_id':'bad'},{'offset':-1},{'limit':0},{'limit':101}]:
            self.assertEqual(self.client.get(self.saved_url(),params=params).status_code,422)
        self.assertEqual(self.client.get(self.saved_url()+'/bad').status_code,422)
        self.assertEqual(self.client.delete(self.saved_url()+'/bad').status_code,422)

    def test_imports_openapi_and_cors(self):
        for layer,module in [('schemas','saved_scenario'),('repositories','saved_scenario_repository'),('services','saved_scenario_service'),('routes','saved_scenarios')]:
            importlib.import_module(f'app.{layer}.{module}')
        response=self.client.get('/openapi.json')
        self.assertEqual(response.status_code,200)
        schema=response.json()
        self.assertEqual(set(schema['paths']['/api/v1/companies/{company_id}/saved-scenarios']),{'post','get'})
        item=schema['paths']['/api/v1/companies/{company_id}/saved-scenarios/{scenario_id}']
        self.assertEqual(set(item),{'get','delete'})
        self.assertIn('204',item['delete']['responses'])
        self.assertEqual(set(schema['components']['schemas']['SavedScenarioCreate']['required']),{'membership_id','simulation_id'})
        response=self.client.options(self.saved_url()+'/'+str(uuid4()),headers={
            'Origin':'http://localhost:5173','Access-Control-Request-Method':'DELETE',
        })
        self.assertEqual(response.status_code,200)


if __name__ == '__main__':
    unittest.main()
