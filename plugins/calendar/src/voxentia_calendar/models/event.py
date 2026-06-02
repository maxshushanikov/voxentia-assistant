from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CalendarEvent(BaseModel):
    id: str
    title: str
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    description: Optional[str] = None
