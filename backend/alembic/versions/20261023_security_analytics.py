"""Authentication and manual operational analytics; no changes to existing business rows."""
from alembic import op
import sqlalchemy as sa
revision="20261023_security_analytics"
down_revision="6683be157420"
branch_labels=None
depends_on=None

def upgrade():
    op.create_table("auth_credentials",sa.Column("user_id",sa.Uuid(),sa.ForeignKey("users.id",ondelete="CASCADE"),primary_key=True),sa.Column("password_hash",sa.String(256),nullable=False),sa.Column("active",sa.Boolean(),nullable=False))
    op.create_table("access_grants",sa.Column("membership_id",sa.Uuid(),sa.ForeignKey("company_memberships.id",ondelete="CASCADE"),primary_key=True),sa.Column("role",sa.String(20),nullable=False))
    op.create_table("login_throttles",sa.Column("key",sa.String(64),primary_key=True),sa.Column("attempts",sa.Integer(),nullable=False),sa.Column("window_start",sa.DateTime(timezone=True),nullable=False))
    op.create_table("auth_sessions",sa.Column("token_hash",sa.String(64),primary_key=True),sa.Column("user_id",sa.Uuid(),sa.ForeignKey("users.id",ondelete="CASCADE"),nullable=False),sa.Column("expires_at",sa.DateTime(timezone=True),nullable=False))
    op.create_index("ix_auth_sessions_user_id","auth_sessions",["user_id"])
    op.create_index("ix_auth_sessions_expires_at","auth_sessions",["expires_at"])
    op.create_table("daily_records",sa.Column("id",sa.Uuid(),primary_key=True),sa.Column("company_id",sa.Uuid(),sa.ForeignKey("companies.id",ondelete="RESTRICT"),nullable=False),sa.Column("record_date",sa.Date(),nullable=False),sa.Column("revenue",sa.Numeric(18,2),nullable=False),*[sa.Column(n,sa.Integer(),nullable=False) for n in ("planned","completed","on_time","available_minutes","productive_minutes","revision")],sa.Column("note",sa.String(500),nullable=False),sa.Column("updated_by",sa.Uuid(),sa.ForeignKey("company_memberships.id",ondelete="RESTRICT"),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),sa.UniqueConstraint("company_id","record_date",name="uq_daily_company_date"),sa.CheckConstraint("revenue >= 0 AND planned >= 0 AND completed >= 0 AND on_time >= 0 AND on_time <= completed AND completed <= planned",name="valid_daily_tasks"),sa.CheckConstraint("available_minutes >= 0 AND productive_minutes >= 0 AND productive_minutes <= available_minutes AND revision > 0",name="valid_daily_time"))
    op.create_index("ix_daily_records_company_id","daily_records",["company_id"])
    op.create_table("daily_audits",sa.Column("id",sa.Uuid(),primary_key=True),sa.Column("company_id",sa.Uuid(),sa.ForeignKey("companies.id",ondelete="RESTRICT"),nullable=False),sa.Column("record_date",sa.Date(),nullable=False),sa.Column("actor_id",sa.Uuid(),sa.ForeignKey("company_memberships.id",ondelete="RESTRICT"),nullable=False),sa.Column("revision",sa.Integer(),nullable=False),sa.Column("values",sa.JSON(),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False))
    op.create_index("ix_daily_audits_company_id","daily_audits",["company_id"])
    op.create_table("analytics_snapshots",sa.Column("id",sa.Uuid(),primary_key=True),sa.Column("company_id",sa.Uuid(),sa.ForeignKey("companies.id",ondelete="RESTRICT"),nullable=False),sa.Column("reference_date",sa.Date(),nullable=False),sa.Column("created_by",sa.Uuid(),sa.ForeignKey("company_memberships.id",ondelete="RESTRICT"),nullable=False),sa.Column("model_version",sa.String(100),nullable=False),sa.Column("input_digest",sa.String(64),nullable=False),sa.Column("source_records",sa.JSON(),nullable=False),sa.Column("result",sa.JSON(),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False))
    op.create_index("ix_analytics_snapshots_company_id","analytics_snapshots",["company_id"])

def downgrade():
    for table in ("analytics_snapshots","daily_audits","daily_records","auth_sessions","login_throttles","access_grants","auth_credentials"):
        op.drop_table(table)
