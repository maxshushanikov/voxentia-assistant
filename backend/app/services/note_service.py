import json
from typing import List, Optional

from app.core.config import settings
from app.models.note import Note
from sqlalchemy.orm import Session
from voxentia.services.llm_client import OllamaClient


class NoteService:
    def _serialize_tags(self, tags: Optional[List[str]] = None) -> str | None:
        if not tags:
            return None
        cleaned = [tag.strip() for tag in tags if tag and tag.strip()]
        return json.dumps(cleaned) if cleaned else None

    def _deserialize_tags(self, tags: str | None) -> list[str]:
        if not tags:
            return []
        try:
            return json.loads(tags) if tags.startswith("[") else [t.strip() for t in tags.split(",") if t.strip()]
        except Exception:
            return [t.strip() for t in tags.split(",") if t.strip()]

    def list_notes(
        self,
        db: Session,
        session_id: str | None = None,
        tag: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ):
        query = db.query(Note)
        if session_id:
            query = query.filter(Note.session_id == session_id)
        if tag:
            query = query.filter(Note.tags.ilike(f"%{tag}%"))
        return query.order_by(Note.created_at.desc()).offset(offset).limit(limit).all()

    def create_note(
        self,
        db: Session,
        title: str,
        content: str,
        session_id: str | None = None,
        tags: Optional[List[str]] = None,
    ):
        note = Note(
            title=title,
            content=content,
            session_id=session_id,
            tags=self._serialize_tags(tags),
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    def update_note(
        self,
        db: Session,
        note_id: int,
        title: str | None = None,
        content: str | None = None,
        tags: Optional[List[str]] = None,
        summary: str | None = None,
    ):
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            return None
        if title is not None:
            note.title = title
        if content is not None:
            note.content = content
        if tags is not None:
            note.tags = self._serialize_tags(tags)
        if summary is not None:
            note.summary = summary
        db.commit()
        db.refresh(note)
        return note

    async def generate_summary(self, db: Session, note_id: int) -> str | None:
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            return None

        prompt = (
            f"Fasse die folgende Notiz auf Deutsch knapper zusammen und nenne die Kernaussagen in 2-3 Sätzen:\n\n"
            f"{note.content.strip()}"
        )
        client = OllamaClient(
            base_url=settings.OLLAMA_URL,
            default_model=settings.DEFAULT_MODEL,
            timeout=settings.OLLAMA_TIMEOUT,
        )
        try:
            summary = await client.generate(prompt, temperature=0.2)
            note.summary = summary.strip() if summary else note.content[:250]
        except Exception:
            note.summary = note.content[:250]
        finally:
            await client.close()

        db.commit()
        db.refresh(note)
        return note.summary

    async def create_tasks_from_note(
        self,
        db: Session,
        note_id: int,
        priority: str = "medium",
        tags: Optional[List[str]] = None,
    ):
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            return []

        from app.services.task_service import TaskService

        task_service = TaskService()
        return await task_service.create_tasks_from_text(
            db,
            text=f"Notiz: {note.title}\n{note.content}",
            priority=priority,
            tags=tags,
        )

    def delete_note(self, db: Session, note_id: int):
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            return False
        db.delete(note)
        db.commit()
        return True
