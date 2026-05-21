from unittest.mock import AsyncMock, MagicMock

import pytest
from app.models.knowledge import KnowledgeEdge
from app.services.knowledge_service import KnowledgeService


@pytest.mark.asyncio
async def test_knowledge_extract_and_store():
    llm = MagicMock()
    llm.generate_json = AsyncMock(
        return_value=[
            {"subject": "Voxentia", "relation": "ist_projekt_von", "object": "Max", "confidence": 0.9}
        ]
    )
    svc = KnowledgeService(llm)

    from app.core.database import Base
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()

    n = await svc.extract_and_store(db, "sess_k", "Voxentia ist ein Projekt von Max")
    assert n == 1
    edges = db.query(KnowledgeEdge).all()
    assert edges[0].subject == "Voxentia"
    assert edges[0].obj == "Max"
    db.close()


def test_build_graph_prompt():
    llm = MagicMock()
    svc = KnowledgeService(llm)
    from app.core.database import Base
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    db.add(
        KnowledgeEdge(
            session_id="s1",
            subject="Max",
            relation="nutzt",
            obj="Voxentia",
            confidence=0.8,
        )
    )
    db.commit()
    prompt = svc.build_graph_prompt(db, "s1")
    assert "Max" in prompt
    assert "nutzt" in prompt
    db.close()
