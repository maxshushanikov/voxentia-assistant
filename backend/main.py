import sys
from pathlib import Path

current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.database import init_db
from api.chat import router as chat_router
from api.webrtc import router as webrtc_router
from api.documents import router as documents_router
from api.transcribe import router as transcribe_router

init_db()

app = FastAPI(
    title="Aura AI API",
    description="Backend for Aura: AI Digital Assistant",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")
app.include_router(webrtc_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(transcribe_router, prefix="/api")

# Static file serving
app.mount("/assets", StaticFiles(directory=str(current_dir.parent / "assets")), name="assets")
app.mount("/api/tts-audio", StaticFiles(directory=str(current_dir.parent / "data" / "audio")), name="tts-audio")
app.mount("/", StaticFiles(directory=str(current_dir.parent / "frontend"), html=True), name="frontend")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)