from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_chat_service
from app.core.rate_limit import limiter
from app.services.chat_service import ChatService
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

router = APIRouter()


class KnowledgeQueryResponse(BaseModel):
    entity: str
    edges: list[dict]
    graph_prompt: str = ""


@router.get("/graph", response_model=KnowledgeQueryResponse)
@limiter.limit(settings.RATE_LIMIT)
async def query_knowledge_graph(
    request: Request,
    session_id: str = "default",
    entity: str = "",
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
):
    if not getattr(settings, "ENABLE_KNOWLEDGE_GRAPH", True):
        raise HTTPException(status_code=404, detail="Knowledge graph disabled")

    if entity:
        edges = chat_service.knowledge_service.query_entity(db, session_id, entity)
        edge_dicts = [
            {
                "id": e.id,
                "subject": e.subject,
                "relation": e.relation,
                "object": e.obj,
                "confidence": e.confidence,
            }
            for e in edges
        ]
    else:
        edge_dicts = chat_service.knowledge_service.list_edges(db, session_id)

    prompt = chat_service.knowledge_service.build_graph_prompt(db, session_id, entity)
    return KnowledgeQueryResponse(entity=entity, edges=edge_dicts, graph_prompt=prompt)


class ExtractRequest(BaseModel):
    session_id: str = Field("default", max_length=128)
    message: str = Field(..., min_length=1, max_length=4096)


@router.post("/extract")
@limiter.limit("20/minute")
async def extract_knowledge(
    request: Request,
    body: ExtractRequest,
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service),
):
    stored = await chat_service.knowledge_service.extract_and_store(
        db, body.session_id, body.message
    )
    return {"stored": stored, "session_id": body.session_id}
