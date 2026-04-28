import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from services.rag import process_document
from pathlib import Path

router = APIRouter()

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
    filepath = UPLOAD_DIR / file.filename
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Process for RAG
    result = await process_document(str(filepath), file.filename)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return {"filename": file.filename, "status": "processed", "details": result["message"]}
