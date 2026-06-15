"""In-memory fake adapters implementing the domain port ABCs.

Each fake stores rows in plain dicts/lists and honors the exact port method
signatures, so it is a drop-in replacement for the SQLAlchemy adapter in unit
tests. Because they subclass the ABC, an unimplemented port method raises
TypeError at instantiation — drift surfaces immediately.
"""

from tests.fakes.fake_relation_repository import FakeRelationRepository
from tests.fakes.fake_user_repository import FakeUserRepository
from tests.fakes.fake_conversation_repository import FakeConversationRepository
from tests.fakes.fake_message_repository import FakeMessageRepository
from tests.fakes.fake_patient_repository import FakePatientRepository
from tests.fakes.fake_specialist_repository import FakeSpecialistRepository

__all__ = [
    "FakeRelationRepository",
    "FakeUserRepository",
    "FakeConversationRepository",
    "FakeMessageRepository",
    "FakePatientRepository",
    "FakeSpecialistRepository",
]
