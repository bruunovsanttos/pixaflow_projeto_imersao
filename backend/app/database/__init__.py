"""Database metadata. Session dependencies live in app.database.session.

Keep metadata imports independent of environment configuration and connections.
"""

from app.database.base import Base

__all__ = ["Base"]
