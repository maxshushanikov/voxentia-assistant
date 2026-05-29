from pydantic import BaseModel


class VisionResponse(BaseModel):
    text: str | None = None
    metadata: dict[str, str | int] | None = None
