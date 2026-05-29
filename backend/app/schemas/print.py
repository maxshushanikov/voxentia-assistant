from pydantic import BaseModel, Field


class PrintRequest(BaseModel):
    html: str = Field(..., min_length=1)
    title: str = Field("document", max_length=128)
