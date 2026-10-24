"""Real authorization and analytics HTTP integration, disposable SQLite only."""
import os
os.environ['DATABASE_URL']='postgresql+psycopg://test:test@127.0.0.1:1/security_tests'
import unittest
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, event
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session
from app.main import create_app
from app.database import Base
from app.database.session import get_db
from app.models.identity import User, Company, CompanyMembership
from app.models.security import Credential, AccessGrant, AuthSession
from app.core.security import hash_password, verify_password
from app.services.analytics_service import calculate

PASSWORD='Test-only-password-2026'
class SecurityAnalyticsTests(unittest.TestCase):
 def setUp(self):
  self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
  @event.listens_for(self.engine,'connect')
  def fk(conn,_): conn.execute('PRAGMA foreign_keys=ON')
  Base.metadata.create_all(self.engine)
  with Session(self.engine) as db:
   company=Company(slug='a',name='A',segment='Tests');other=Company(slug='b',name='B',segment='Tests')
   db.add_all([company,other]);db.flush();self.company=company.id;self.other=other.id
   self.users={};self.members={}
   for role in ['admin','operator','viewer','outsider']:
    user=User(name=role,email=f'{role}@example.com');db.add(user);db.flush()
    member=CompanyMembership(company_id=other.id if role=='outsider' else company.id,user_id=user.id,job_title=role)
    db.add(member);db.flush();self.users[role]=user.id;self.members[role]=member.id
    db.add(Credential(user_id=user.id,password_hash=hash_password(PASSWORD)))
    db.add(AccessGrant(membership_id=member.id,role='admin' if role=='outsider' else role))
   db.commit()
  self.app=create_app();self.app.state.settings.cors_origins=['https://testserver']
  def database():
   with Session(self.engine) as db: yield db
  self.app.dependency_overrides[get_db]=database
  self.client=TestClient(self.app,base_url='https://testserver',headers={'Origin':'https://testserver'})
  self.client.__enter__();self.base=f'/api/v1/companies/{self.company}'
 def tearDown(self):
  self.client.__exit__(None,None,None);self.engine.dispose()
 def login(self,role='admin'):
  response=self.client.post('/api/v1/auth/login',json={'email':f'{role}@example.com','password':PASSWORD})
  self.assertEqual(response.status_code,200,response.text);return response
 def data(self,**kwargs):
  return dict(revenue='100.00',planned=10,completed=8,on_time=6,available_minutes=480,productive_minutes=360,expected_revision=0,**kwargs)
 def test_anonymous_login_cookie_logout_and_replay(self):
  self.assertEqual(self.client.get(self.base+'/risks').status_code,401)
  response=self.login();cookie=response.headers['set-cookie']
  for flag in ['HttpOnly','Secure','SameSite=lax']:self.assertIn(flag,cookie)
  self.assertNotIn('token',response.json())
  token=self.client.cookies.get('nexora_session')
  self.assertEqual(self.client.get('/api/v1/auth/me').status_code,200)
  self.assertEqual(self.client.post('/api/v1/auth/logout').status_code,204)
  self.client.cookies.set('nexora_session',token)
  self.assertEqual(self.client.get(self.base+'/risks').status_code,401)
 def test_company_isolation_self_identity_and_membership_lists(self):
  self.login()
  companies=self.client.get('/api/v1/companies').json();self.assertEqual([c['id'] for c in companies],[str(self.company)])
  members=self.client.get(self.base+'/memberships').json();self.assertEqual([m['id'] for m in members],[str(self.members['admin'])])
  for suffix in ['', '/risks','/opportunities','/timeline-events','/daily-data','/analytics/latest']:
   self.assertEqual(self.client.get(f'/api/v1/companies/{self.other}'+suffix).status_code,403)
  self.assertEqual(self.client.get(f'/api/v1/users/{self.users["viewer"]}').status_code,403)
  self.assertEqual(self.client.get(f'/api/v1/memberships/{self.members["viewer"]}/preferences').status_code,403)
  self.assertEqual(self.client.post('/api/v1/companies',json={}).status_code,403)
 def test_viewer_denied_operator_allowed_and_csrf(self):
  self.login('viewer');url=self.base+'/daily-data/2026-10-01'
  self.assertEqual(self.client.put(url,json=self.data()).status_code,403)
  self.login('operator')
  self.assertEqual(self.client.put(url,json=self.data(),headers={'Origin':'https://evil.example'}).status_code,403)
  self.assertEqual(self.client.put(url,json=self.data()).status_code,200)
  self.assertEqual(self.client.post(self.base+'/memberships',json={}).status_code,403)
 def test_login_rate_limit_invalid_password_and_expired_session(self):
  for _ in range(5):self.assertEqual(self.client.post('/api/v1/auth/login',json={'email':'viewer@example.com','password':'wrong'}).status_code,401)
  self.assertEqual(self.client.post('/api/v1/auth/login',json={'email':'viewer@example.com','password':PASSWORD}).status_code,429)
  self.login()
  with Session(self.engine) as db:
   row=db.scalar(select(AuthSession));row.expires_at=datetime.now(timezone.utc)-timedelta(seconds=1);db.commit()
  self.assertEqual(self.client.get('/api/v1/auth/me').status_code,401)
 def test_manual_validation_revision_audit_and_stale_snapshot(self):
  self.login();url=self.base+'/daily-data/2026-10-01'
  bad=self.data();bad['on_time']=9
  self.assertEqual(self.client.put(url,json=bad).status_code,422)
  bad=self.data();bad['productive_minutes']=481
  self.assertEqual(self.client.put(url,json=bad).status_code,422)
  self.assertEqual(self.client.put(self.base+'/daily-data/2099-01-01',json=self.data()).status_code,422)
  saved=self.client.put(url,json=self.data());self.assertEqual(saved.status_code,200,saved.text);self.assertEqual(saved.json()['revision'],1)
  self.assertEqual(self.client.put(url,json=self.data()).status_code,409)
  run=self.client.post(self.base+'/analytics',json={'reference_date':'2026-10-01'});self.assertEqual(run.status_code,201,run.text)
  snapshot=run.json();self.assertEqual(snapshot['result']['health'],60);self.assertEqual(snapshot['result']['efficiency'],75);self.assertIsNone(snapshot['result']['revenue_forecast']);self.assertFalse(snapshot['stale'])
  changed=self.data();changed.update(expected_revision=1,revenue='200.00')
  self.assertEqual(self.client.put(url,json=changed).status_code,200)
  current=self.client.get(self.base+'/analytics/latest').json();self.assertTrue(current['stale']);self.assertEqual(current['result'],snapshot['result'])
  self.assertEqual(len(self.client.get(url+'/history').json()),2)
  self.assertEqual(self.client.post(self.base+'/analytics',json={'reference_date':'2099-01-01'}).status_code,422)
 def test_complete_history_forecast_and_immutable_versions(self):
  self.login();reference=date(2026,10,1)
  for i in range(28):self.assertEqual(self.client.put(self.base+f'/daily-data/{reference-timedelta(days=i)}',json=self.data()).status_code,200)
  first=self.client.post(self.base+'/analytics',json={'reference_date':str(reference)}).json()
  self.assertEqual(first['result']['revenue_forecast'],'3000.00');self.assertEqual(first['result']['coverage_days'],28)
  second=self.client.post(self.base+'/analytics',json={'reference_date':str(reference-timedelta(days=1))}).json()
  self.assertEqual(self.client.get(self.base+'/analytics/latest').json()['id'],second['id'])
  self.assertEqual(len(self.client.get(self.base+'/analytics/history').json()),2)
 def test_simulation_and_saved_scenario_owner_isolation(self):
  self.login()
  body=dict(decision_kind='marketing',amount=10,question='Test',reference_date='2026-10-01',horizon_days=7,model_version='test-v1',assumption='Test',additional_cost='20',initial_capital='100',incremental_balance='0',created_by_membership_id=str(self.members['admin']),baseline=dict(investment='0',clients=10,revenue='100',capacity='90'),simulated=dict(investment='10',clients=10,revenue='100',capacity='90'),recommendations=[])
  created=self.client.post(self.base+'/simulations',json=body);self.assertEqual(created.status_code,201,created.text)
  sim_id=created.json()['id'];saved=self.client.post(self.base+'/saved-scenarios',json={'membership_id':str(self.members['admin']),'simulation_id':sim_id});self.assertEqual(saved.status_code,201,saved.text)
  scenario=saved.json()['id'];self.login('operator')
  self.assertEqual(self.client.get(self.base+'/simulations/'+sim_id).status_code,403)
  self.assertEqual(self.client.get(self.base+'/saved-scenarios').json(),[])
  self.assertEqual(self.client.get(self.base+'/saved-scenarios/'+scenario).status_code,403)
  self.assertEqual(self.client.delete(self.base+'/saved-scenarios/'+scenario).status_code,403)
  self.assertEqual(self.client.post(self.base+'/saved-scenarios',json={'membership_id':str(self.members['operator']),'simulation_id':sim_id}).status_code,403)
  self.assertEqual(self.client.post(self.base+'/simulations',json=body).status_code,403)
 def test_password_hash_salts_and_verification(self):
  a=hash_password(PASSWORD);b=hash_password(PASSWORD);self.assertNotEqual(a,b);self.assertTrue(verify_password(PASSWORD,a));self.assertFalse(verify_password('wrong',a));self.assertFalse(verify_password(PASSWORD,'invalid'))
 def test_empty_zero_denominators_and_missing_days(self):
  reference=date(2024,3,1)
  empty=calculate([],reference);self.assertIsNone(empty['health']);self.assertIsNone(empty['efficiency']);self.assertIsNone(empty['revenue_forecast'])
  rows=[SimpleNamespace(record_date=reference-timedelta(days=i),revenue=Decimal('0'),planned=0,on_time=0,available_minutes=0,productive_minutes=0) for i in range(28)]
  result=calculate(rows,reference);self.assertEqual(result['revenue_forecast'],'0.00');self.assertIsNone(result['health']);self.assertEqual(len(result['trend']),28)
  self.assertIsNone(calculate(rows[:-1],reference)['revenue_forecast'])
if __name__=='__main__':unittest.main()
