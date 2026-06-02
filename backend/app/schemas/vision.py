from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class VisionResponse(BaseModel):
    text: str | None = None
    metadata: Optional[Dict[str, Any]] = None
    tables: Optional[List[List[str]]] = None
    summary: Optional[str] = None
    invoice_fields: Optional[Dict[str, str]] = None
    contract_summary: Optional[str] = None
