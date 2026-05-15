from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.v1.chat import router as chat_router

# Initialize Database
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Professional Backend for Voxentia AI Assistant"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(chat_router, prefix="/api/v1", tags=["Chat"])
# Maintain compatibility with legacy /api prefix
app.include_router(chat_router, prefix="/api", tags=["Legacy Chat"])

# Static Files
# Serve generated audio files
app.mount("/api/tts-audio", StaticFiles(directory=str(settings.AUDIO_CACHE_DIR)), name="tts-audio")
# Serve general assets (3D models, etc)
assets_path = settings.BASE_DIR / "assets"
if assets_path.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
