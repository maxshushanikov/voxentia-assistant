from typing import Optional

from pydantic import BaseModel


class JobPosting(BaseModel):
    id: str
    title: str
    company: str
    location: str
    salary: Optional[str] = None
    url: str
    description: Optional[str] = None
    source: str
