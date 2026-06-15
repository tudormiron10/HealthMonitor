"""Shared pytest fixtures: fake repositories and services wired to them.

All fixtures are function-scoped, so every test gets a fresh, isolated set of
fakes — no state leaks between tests and execution order is irrelevant. Within
a single test, pytest caches each fixture, so `message_repo` injected into both
`conversation_service` and `chat_service` is the same instance (shared state).
"""

import pytest

from application.chat_service import ChatService
from application.conversation_service import ConversationService
from application.prediction_service import PredictionService
from application.relation_service import RelationService
from tests.fakes import (
    FakeConversationRepository,
    FakeMessageRepository,
    FakeRelationRepository,
    FakeUserRepository,
)


# --- Fake repositories ------------------------------------------------------

@pytest.fixture
def relation_repo() -> FakeRelationRepository:
    return FakeRelationRepository()


@pytest.fixture
def user_repo() -> FakeUserRepository:
    return FakeUserRepository()


@pytest.fixture
def conversation_repo() -> FakeConversationRepository:
    return FakeConversationRepository()


@pytest.fixture
def message_repo() -> FakeMessageRepository:
    return FakeMessageRepository()


# --- Services under test ----------------------------------------------------

@pytest.fixture
def relation_service(relation_repo, user_repo) -> RelationService:
    return RelationService(relation_repo=relation_repo, user_repo=user_repo)


@pytest.fixture
def conversation_service(
    conversation_repo, relation_repo, user_repo, message_repo
) -> ConversationService:
    return ConversationService(
        conversation_repo=conversation_repo,
        relation_repo=relation_repo,
        user_repo=user_repo,
        message_repo=message_repo,
    )


@pytest.fixture
def chat_service(message_repo, conversation_service) -> ChatService:
    return ChatService(message_repo=message_repo, conversation_service=conversation_service)


@pytest.fixture
def prediction_service() -> PredictionService:
    return PredictionService()
