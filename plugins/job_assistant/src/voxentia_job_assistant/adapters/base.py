from abc import ABC, abstractmethod
from typing import List

from voxentia_job_assistant.models.job import JobPosting


class JobSourceAdapter(ABC):
    """Abstrakte Basisklasse für Job-Quellen (Indeed, LinkedIn, etc.)."""

    @abstractmethod
    async def search(self, query: str, location: str) -> List[JobPosting]:
        pass
