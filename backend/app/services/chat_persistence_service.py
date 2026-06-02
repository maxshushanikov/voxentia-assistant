from __future__ import annotations

import uuid
from typing import Optional

from app.domain.chat import ChatMessageRecord, ChatSession
from app.models.chat import ChatMessage
from app.models.session import ChatSessionMeta
from sqlalchemy import func
from sqlalchemy.orm import Session


class ChatPersistenceService:
    def save_user_message(
        self,
        db: Session,
        *,
        session_id: str,
        content: str,
        model: str,
        branch_id: str,
    ) -> None:
        db.add(
            ChatMessage(
                session_id=session_id,
                role="user",
                content=content,
                model=model,
                branch_id=branch_id,
            )
        )
        db.commit()

    def save_assistant_message(
        self,
        db: Session,
        *,
        session_id: str,
        content: str,
        model: str,
        branch_id: str,
    ) -> int | None:
        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=content,
            model=model,
            branch_id=branch_id,
        )
        db.add(assistant_msg)
        db.commit()
        return assistant_msg.id

    def get_recent_history(self, db: Session, *, session_id: str, limit: int) -> list[dict[str, str]]:
        previous_messages = (
            db.query(ChatMessage)
            .filter_by(session_id=session_id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(limit)
            .all()
        )
        return [{"role": m.role, "content": m.content} for m in reversed(previous_messages)]

    def fork_session(self, db: Session, session_id: str, message_id: int) -> tuple[str, str, int]:
        target = (
            db.query(ChatMessage)
            .filter(ChatMessage.id == message_id, ChatMessage.session_id == session_id)
            .first()
        )
        if not target:
            raise ValueError(f"Message {message_id} not found in session {session_id}")

        id_filter = ChatMessage.id < message_id
        if target.role != "assistant":
            id_filter = ChatMessage.id <= message_id
        prior = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id, id_filter)
            .order_by(ChatMessage.id.asc())
            .all()
        )

        new_sid = f"sess_{uuid.uuid4().hex[:12]}"
        branch_id = f"branch_{uuid.uuid4().hex[:8]}"
        for m in prior:
            db.add(
                ChatMessage(
                    session_id=new_sid,
                    role=m.role,
                    content=m.content,
                    model=m.model,
                    parent_id=m.id,
                    branch_id=branch_id,
                )
            )

        meta = db.query(ChatSessionMeta).filter_by(session_id=session_id).first()
        title = f"{meta.title} (Branch)" if meta and meta.title else "Branch"
        db.merge(ChatSessionMeta(session_id=new_sid, title=title[:128]))
        db.commit()
        return new_sid, branch_id, len(prior)

    def get_history(
        self, db: Session, session_id: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[ChatMessageRecord], int]:
        query = db.query(ChatMessage).filter(ChatMessage.session_id == session_id)
        total = query.count()
        rows = query.order_by(ChatMessage.timestamp.asc()).offset(offset).limit(limit).all()
        records = [
            ChatMessageRecord(
                session_id=m.session_id,
                role=m.role,
                content=m.content,
                timestamp=m.timestamp,
                model=m.model,
                id=m.id,
                parent_id=m.parent_id,
                branch_id=m.branch_id or "main",
                feedback=m.feedback,
            )
            for m in rows
        ]
        return records, total

    def set_feedback(
        self, db: Session, session_id: str, message_id: int, feedback: Optional[str]
    ) -> None:
        if feedback not in (None, "like", "dislike"):
            raise ValueError("Invalid feedback value")

        message = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id, ChatMessage.id == message_id)
            .first()
        )
        if not message or message.role != "assistant":
            raise ValueError("Message not found or feedback is only allowed for assistant replies")

        message.feedback = feedback
        db.commit()

    def get_sessions(self, db: Session) -> list[ChatSession]:
        subq_min = (
            db.query(
                ChatMessage.session_id,
                ChatMessage.content.label("first_content"),
                func.row_number().over(
                    partition_by=ChatMessage.session_id,
                    order_by=ChatMessage.timestamp.asc(),
                ).label("rn_min"),
            )
            .filter(ChatMessage.role == "user")
            .subquery()
        )
        subq_max = (
            db.query(
                ChatMessage.session_id,
                ChatMessage.model.label("last_model"),
                ChatMessage.timestamp.label("last_ts"),
                func.row_number().over(
                    partition_by=ChatMessage.session_id,
                    order_by=ChatMessage.timestamp.desc(),
                ).label("rn_max"),
            )
            .subquery()
        )
        rows = (
            db.query(
                subq_max.c.session_id,
                subq_max.c.last_ts,
                subq_max.c.last_model,
                subq_min.c.first_content,
            )
            .join(
                subq_min,
                (subq_max.c.session_id == subq_min.c.session_id) & (subq_min.c.rn_min == 1),
                isouter=True,
            )
            .filter(subq_max.c.rn_max == 1)
            .order_by(subq_max.c.last_ts.desc())
            .all()
        )

        session_ids = [r.session_id for r in rows]
        titles_by_id: dict[str, str] = {}
        if session_ids:
            meta_rows = db.query(ChatSessionMeta).filter(ChatSessionMeta.session_id.in_(session_ids)).all()
            titles_by_id = {m.session_id: m.title for m in meta_rows if m.title}

        return [
            ChatSession(
                session_id=r.session_id,
                title=titles_by_id.get(r.session_id) or (r.first_content[:60] if r.first_content else r.session_id),
                last_timestamp=r.last_ts,
                model=r.last_model,
            )
            for r in rows
        ]

    def delete_session(self, db: Session, session_id: str, *, include_memory: bool, include_sentiment: bool) -> int:
        deleted = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .delete(synchronize_session=False)
        )
        db.query(ChatSessionMeta).filter(ChatSessionMeta.session_id == session_id).delete(
            synchronize_session=False
        )
        if include_memory:
            from app.models.memory import UserMemory

            db.query(UserMemory).filter(UserMemory.session_id == session_id).delete(synchronize_session=False)
        if include_sentiment:
            from app.models.sentiment import SentimentRecord

            db.query(SentimentRecord).filter(SentimentRecord.session_id == session_id).delete(
                synchronize_session=False
            )
        db.commit()
        return deleted

    def delete_all_sessions(self, db: Session, *, include_memory: bool, include_sentiment: bool) -> int:
        deleted = db.query(ChatMessage).delete(synchronize_session=False)
        db.query(ChatSessionMeta).delete(synchronize_session=False)
        if include_memory:
            from app.models.memory import UserMemory

            db.query(UserMemory).delete(synchronize_session=False)
        if include_sentiment:
            from app.models.sentiment import SentimentRecord

            db.query(SentimentRecord).delete(synchronize_session=False)
        db.commit()
        return deleted
