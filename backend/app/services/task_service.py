from datetime import datetime
from sqlalchemy.orm import Session

from app.models.task import Task


class TaskService:
    def list_tasks(self, db: Session, status: str | None = None, limit: int = 50, offset: int = 0):
        query = db.query(Task)
        if status:
            query = query.filter(Task.status == status)
        return query.order_by(Task.due_date.is_(None), Task.due_date.asc(), Task.created_at.desc()).offset(offset).limit(limit).all()

    def create_task(
        self,
        db: Session,
        title: str,
        description: str | None = None,
        status: str = "pending",
        due_date: datetime | None = None,
    ):
        task = Task(title=title, description=description, status=status, due_date=due_date)
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
        if due_date is not None:
            task.due_date = due_date
        db.commit()
        db.refresh(task)
        return task

    def delete_task(self, db: Session, task_id: int):
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return False
        db.delete(task)
        db.commit()
        return True
