from typing import Optional

from app.core.database import get_db
from app.schemas.tasks import TaskListResponse, TaskRequest, TaskResponse, TaskUpdateRequest
from app.services.task_service import TaskService
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

router = APIRouter()
service = TaskService()

@router.get("/", response_model=TaskListResponse)
async def list_tasks(
    status: Optional[str] = Query(None, pattern="^(pending|completed|cancelled|archived)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    tasks = service.list_tasks(db, status=status, limit=limit, offset=offset)
    return {"tasks": [task.to_dict() for task in tasks]}

@router.post("/", response_model=TaskResponse)
async def create_task(request: TaskRequest, db: Session = Depends(get_db)):
    task = service.create_task(
        db,
        title=request.title,
        description=request.description,
        status=request.status or "pending",
        due_date=request.due_date,
    )
    return task.to_dict()

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, request: TaskUpdateRequest, db: Session = Depends(get_db)):
    task = service.update_task(
        db,
        task_id=task_id,
        title=request.title,
        description=request.description,
        status=request.status,
        due_date=request.due_date,
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.to_dict()

@router.delete("/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    deleted = service.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"deleted": True, "task_id": task_id}
