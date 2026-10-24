import importlib.util
from pathlib import Path
import unittest
from sqlalchemy import create_engine, inspect
from alembic.migration import MigrationContext
from alembic.operations import Operations
from app.database import Base
from app import models
class MigrationTest(unittest.TestCase):
 def test_upgrade_and_downgrade_preserve_business_tables(self):
  engine=create_engine('sqlite://')
  new={'auth_credentials','access_grants','login_throttles','auth_sessions','daily_records','daily_audits','analytics_snapshots'}
  Base.metadata.create_all(engine,tables=[t for t in Base.metadata.sorted_tables if t.name not in new])
  spec=importlib.util.spec_from_file_location('security_migration',Path('alembic/versions/20261023_security_analytics.py'))
  migration=importlib.util.module_from_spec(spec);spec.loader.exec_module(migration)
  with engine.begin() as connection:
   migration.op=Operations(MigrationContext.configure(connection))
   migration.upgrade();self.assertTrue(new.issubset(set(inspect(connection).get_table_names())))
   migration.downgrade();tables=set(inspect(connection).get_table_names());self.assertFalse(new & tables);self.assertIn('companies',tables);self.assertIn('risks',tables)
  engine.dispose()
