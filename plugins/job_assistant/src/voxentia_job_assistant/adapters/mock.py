from typing import List
import uuid
from voxentia_job_assistant.adapters.base import JobSourceAdapter
from voxentia_job_assistant.models.job import JobPosting

class MockJobAdapter(JobSourceAdapter):
    """Gibt statische Testdaten für die Jobsuche zurück."""
    
    async def search(self, query: str, location: str) -> List[JobPosting]:
        return [
            JobPosting(
                id=str(uuid.uuid4()),
                title=f"Senior {query} Developer",
                company="TechCorp Solutions",
                location=location,
                salary="80.000 - 100.000 EUR",
                url="https://example.com/job1",
                source="Internal"
            ),
            JobPosting(
                id=str(uuid.uuid4()),
                title=f"Junior {query} Engineer",
                company="StartUp Inc.",
                location=location,
                salary="45.000 - 55.000 EUR",
                url="https://example.com/job2",
                source="Internal"
            )
        ]
