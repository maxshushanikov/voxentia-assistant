import json
import logging
from datetime import datetime
from typing import List, Optional

from app.core.config import settings
from app.models.task import Task
from sqlalchemy.orm import Session
from voxentia.services.llm_client import OllamaClient

logger = logging.getLogger(__name__)


class TaskService:
    def __init__(self, llm_client: OllamaClient | None = None) -> None:
        self.llm = llm_client or OllamaClient(
            base_url=settings.OLLAMA_URL,
            default_model=settings.DEFAULT_MODEL,
            timeout=settings.OLLAMA_TIMEOUT,
        )

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

    def list_tasks(
        self,
        db: Session,
        status: str | None = None,
        priority: str | None = None,
        tag: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ):
        query = db.query(Task)
        if status:
            query = query.filter(Task.status == status)
        if priority:
            query = query.filter(Task.priority == priority)
        if tag:
            query = query.filter(Task.tags.ilike(f"%{tag}%"))
        return query.order_by(Task.due_date.is_(None), Task.due_date.asc(), Task.created_at.desc()).offset(offset).limit(limit).all()

    def create_task(
        self,
        db: Session,
        title: str,
        description: str | None = None,
        status: str = "pending",
        priority: str = "medium",
        tags: Optional[List[str]] = None,
        due_date: datetime | None = None,
    ):
        task = Task(
            title=title,
            description=description,
            status=status,
            priority=priority,
            tags=self._serialize_tags(tags),
            due_date=due_date,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    def update_task(
        self,
        db: Session,
        task_id: int,
        title: str | None = None,
        description: str | None = None,
        status: str | None = None,
        priority: str | None = None,
        tags: Optional[List[str]] = None,
        due_date: datetime | None = None,
    ):
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None
        if title is not None:
            task.title = title
        if description is not None:
            task.description = description
        if status is not None:
            task.status = status
        if priority is not None:
            task.priority = priority
        if tags is not None:
            task.tags = self._serialize_tags(tags)
        if due_date is not None:
            task.due_date = due_date
        db.commit()
        db.refresh(task)
        return task

    async def create_tasks_from_text(
        self,
        db: Session,
        text: str,
        priority: str = "medium",
        tags: Optional[List[str]] = None,
        max_tasks: int = 4,
    ) -> list[Task]:
        prompt = (
            f"Lese den folgenden Text und extrahiere bis zu {max_tasks} konkrete Aufgaben, die sich daraus ableiten lassen. "
            f"Formuliere jede Aufgabe als kurze, handlungsorientierte Beschreibung und liefere sie als JSON-Liste im Format ``[{{\"title\": ..., \"description\": ...}}]``. "
            f"Gib nur gültiges JSON zurück, ohne erklärenden Text."
            f"\n\nText:\n{text.strip()}"
        )

        generated = []
        try:
            response = await self.llm.generate_json(prompt, temperature=0.2)
            if isinstance(response, list):
                for item in response[:max_tasks]:
                    title = item.get("title") or item.get("task") or item.get("description")
                    description = item.get("description") or item.get("details") or ""
                    if title:
                        generated.append({"title": title.strip(), "description": description.strip()})
        except Exception as e:
            logger.warning("Task extraction via LLM failed: %s", e)

        if not generated:
            lines = [line.strip("-•* \t") for line in text.splitlines() if line.strip()]
            for line in lines:
                if len(generated) >= max_tasks:
                    break
                if any(word in line.lower() for word in ("erstelle", "schreibe", "prüfe", "kontaktiere", "überarbeite", "prüfen", "mache", "erledige")):
                    generated.append({"title": line[:120], "description": line})
            if not generated:
                generated = [{"title": text.strip()[:120], "description": text.strip()}]

        tasks = []
        for item in generated:
            task = self.create_task(
                db,
                title=item["title"],
                description=item.get("description"),
                status="pending",
                priority=priority,
                tags=tags,
            )
            tasks.append(task)
        return tasks

    def delete_task(self, db: Session, task_id: int):
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return False
        db.delete(task)
        db.commit()
        return True
