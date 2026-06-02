from typing import Optional

from pydantic import BaseModel, Field


class PrintRequest(BaseModel):
    html: str = Field(..., min_length=1)
    title: str = Field("document", max_length=128)


class PrintJobRequest(BaseModel):
    html: str = Field(..., min_length=1)
    title: str = Field("document", max_length=128)


class PrintJobResponse(BaseModel):
    id: int
    title: str
    status: str
    output_path: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True
