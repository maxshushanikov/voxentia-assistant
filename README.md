# Voxentia — Modular Local AI Assistant

> A privacy-first digital assistant with a 3D avatar, voice interaction, document RAG, and a plugin architecture. Runs entirely on your hardware via Docker.

**Languages:** [Deutsch](README_DE.md) · [Русский](README_RU.md)

---

## Overview

Voxentia combines a **React + Three.js** frontend, a **FastAPI** backend, the **voxentia-core** orchestrator, and optional **plugins** (calendar, jobs, learning, documents). Speech uses **Ollama** (LLM), **Whisper** (STT), and **Silero** (TTS). PDFs are indexed in **ChromaDB** for retrieval-augmented answers.

| Property | Value |
|----------|--------|
| Default LLM | `phi3` (via Ollama) |
| Languages | English, German, Russian |
| API | `/api/v1` (+ legacy `/api` aliases) |
| UI | http://localhost (Nginx) or Vite dev on :5173 |

---

## Features

| Area | Details |
|------|---------|
| **Chat** | Session-based history, personalities (professional / friendly / academic), optional model override |
| **Voice** | Microphone → Whisper STT; replies → Silero TTS with lip-sync on the 3D avatar |
| **Avatar** | GLB models (feminine/masculine), auto-framed in the viewport, idle/talking animations |
| **Documents** | PDF upload → chunking → embeddings → RAG context in chat |
| **Plugins** | Backend plugins via `plugin_config.json`; frontend plugin panels in the sidebar |
| **History** | Grouped by time (today / yesterday / 7d / 30d), preview limit, **delete single or all chats** |
| **Ops** | Health checks, rate limiting, request IDs, structured logging |

---

## Architecture

```text
Browser (React)
    │  /api/*
    ▼
Nginx (:80) ──► FastAPI backend/app (:8000)
                    ├── SQLite (chat history, WAL mode)
                    ├── ChromaDB (documents)
                    ├── voxentia-core (orchestrator + plugins)
                    ├── Ollama (:11434) — LLM + embeddings
                    ├── tts-server (:5002) — Silero TTS
                    └── whisper-server (:5003) — faster-whisper
```

### Repository layout

```text
voxentia-assistant/
├── backend/app/           # FastAPI (canonical API)
├── core/                  # voxentia-core package
├── frontend/              # React + Vite + Tailwind + Three.js
├── plugins/               # Optional Python plugins
├── i18n/locales/          # UI strings (en, de, ru)
├── tts-server/            # Silero TTS microservice
├── whisper-server/        # Whisper STT microservice
├── deployment/docker/     # Dockerfiles + nginx.conf
├── tests/                 # pytest
├── scripts/               # e.g. export_openapi.py
└── data/                  # Runtime DB, chroma, audio (gitignored)
```

---

## Prerequisites

- **Docker Desktop** with Compose v2
- **8 GB+ RAM** recommended (TTS models are loaded on demand)
- **GPU** optional (CPU works; set env vars on whisper/tts for CUDA if needed)

---

## Quick start

### Windows

```powershell
.\run.bat install   # optional: local Python/Node setup
.\run.bat up        # docker compose up --build
```

Or:

```powershell
docker compose up --build
```

### Linux / macOS

```bash
make docker-up
# or
docker compose up --build
```

Open **http://localhost** (production stack) or run the frontend in dev mode:

```bash
cd frontend && npm install && npm run dev
# API proxied to http://localhost:8000
```

---

## Configuration

Copy `.env.example` to `.env` in the project root.

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_MODEL` | `phi3` | Ollama model for chat |
| `DEFAULT_LANGUAGE` | `en` | Default UI/assistant language |
| `OLLAMA_URL` | `http://ollama:11434` | Ollama base URL (Docker network) |
| `TTS_URL` | `http://tts-server:5002` | TTS service |
| `WHISPER_URL` | `http://whisper-server:5003` | STT service |
| `RATE_LIMIT` | `60/minute` | API rate limit (slowapi) |
| `TTS_TIMEOUT` | `120` | Seconds to wait for TTS generation |
| `ALLOWED_ORIGINS` | localhost URLs | CORS origins (comma-separated) |

### Plugin configuration

Edit `backend/app/core/config/plugin_config.json` to enable/disable plugins (`job_assistant`, `calendar`, etc.).

---

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health + version |
| `POST` | `/api/v1/chat` | Send message, get text + optional `audio_url` |
| `GET` | `/api/v1/chat/history?session_id=` | Paginated history (`limit`, `offset`) |
| `GET` | `/api/v1/sessions` | List chat sessions |
| `DELETE` | `/api/v1/sessions/{id}` | Delete one session |
| `DELETE` | `/api/v1/sessions` | Delete all sessions |
| `POST` | `/api/v1/transcribe` | Audio → text |
| `POST` | `/api/v1/documents/upload` | PDF → RAG index |
| `GET` | `/api/v1/plugins/list` | Installed plugins metadata |

Legacy routes under `/api/...` mirror the above for older clients.

Interactive docs: **http://localhost:8000/docs** (when backend port is exposed).

---

## Development

### Backend

```bash
pip install -e core
pip install -r backend/requirements.txt
pip install -r requirements-dev.txt
pytest tests/ -v
```

```powershell
$env:PYTHONPATH = "core/src;backend"
python backend/app/main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run test
npm run build
```

Regenerate OpenAPI types after API changes:

```bash
python scripts/export_openapi.py
cd frontend && npm run generate:api
```

---

## UI guide

- **Sidebar — Plugins:** Open calendar, jobs, documents, notes, etc.
- **Sidebar — History:** Recent chats (preview); link **Show all** / **Alle anzeigen** for full list; trash icon to delete a chat.
- **Header:** Language, voice, personality.
- **Chat input:** Text, microphone, file upload (PDF).
- **Avatar panel:** 3D model centered and scaled to fit; mouth moves with TTS audio.

---

## Security & privacy

- No cloud LLM calls when using the default Docker stack.
- Do **not** commit `ollama_data/` (SSH keys, model cache) or `.env`.
- Rate limiting and request IDs are enabled on the API.
- CORS is restricted to configured origins and standard headers.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| No voice | TTS container healthy (`docker compose ps`); backend logs for `TTS service error`; browser console for `audio_url` |
| Ollama errors | `ollama-init` completed; `docker compose logs ollama` |
| Empty plugins | `plugin_config.json` enabled flags; `docker compose logs backend` |
| Frontend build fails | `frontend/.npmrc` (`legacy-peer-deps`); run `npm ci` in `frontend/` |

---

## License

MIT License — © 2026 Voxentia Project.
