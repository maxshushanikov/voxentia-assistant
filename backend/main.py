# Main entry point for the Voxentia Backend
import sys
from pathlib import Path

# Add the current directory to sys.path to allow absolute imports within the backend package
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

# Initialize the database (SQLite for history/metadata and ChromaDB for RAG)
init_db()

# Initialize FastAPI application
app = FastAPI(
    title="Voxentia AI API",
    description="Backend for Voxentia: AI Digital Assistant. Orchestrates LLM, TTS, STT, and RAG.",
    version="3.1.0"
)

# Configure CORS for frontend access (allows origins specified in .env)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes for various functionalities
app.include_router(chat_router, prefix="/api")
app.include_router(webrtc_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(transcribe_router, prefix="/api")

# Static file serving:
# /assets: 3D models, textures, and other UI assets
app.mount("/assets", StaticFiles(directory=str(current_dir.parent / "assets")), name="assets")
# /api/tts-audio: Temporary cache for generated TTS audio files
app.mount("/api/tts-audio", StaticFiles(directory=str(current_dir.parent / "data" / "audio")), name="tts-audio")
# /: Serves the frontend application (index.html and JS/CSS modules)
app.mount("/", StaticFiles(directory=str(current_dir.parent / "frontend"), html=True), name="frontend")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)