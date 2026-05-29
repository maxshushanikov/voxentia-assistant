from pydantic import BaseModel


class JobListing(BaseModel):
    id: str
    title: str
    company: str
    location: str
    summary: str
    url: str


class JobSearchResponse(BaseModel):
    jobs: list[JobListing]
