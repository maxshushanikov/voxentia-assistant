# Voxentia Backend

FastAPI application: REST API, chat persistence, RAG, voice proxying, and integration with **voxentia-core**.

## Stack

| Component | Role |
|-----------|------|
| FastAPI | HTTP API, OpenAPI at `/docs` |
| SQLAlchemy + SQLite | Chat messages (WAL mode for concurrency) |
| ChromaDB | Document embeddings (RAG) |
| httpx | Calls to Ollama, TTS, Whisper |
| slowapi | Rate limiting |
| voxentia-core | Plugin registry, intent routing, LLM client |

## Layout

```text
backend/app/
├── main.py                 # App factory, CORS, middleware, static mounts
├── api/v1/
│   ├── chat.py             # Chat, history, sessions, transcribe
│   ├── documents.py        # PDF upload / list / delete / search
│   └── plugins.py          # Plugin metadata from registry
├── core/
│   ├── config.py           # Pydantic settings (.env)
│   ├── database.py         # Engine, sessions, WAL
│   ├── exceptions.py       # Unified error responses
│   ├── middleware.py       # X-Request-ID
│   └── config/plugin_config.json
├── models/chat.py          # ChatMessage ORM
├── schemas/                # Pydantic + enums
└── services/
    ├── chat_service.py     # Orchestrator + DB + TTS trigger
    ├── voice_service.py    # TTS/STT proxies
    └── rag_service.py      # Chroma + PDF
```

## Session API

- `GET /api/v1/sessions` — list sessions (title from first user message)
- `DELETE /api/v1/sessions/{session_id}` — delete one session and all its messages
- `DELETE /api/v1/sessions` — wipe all chat history

## Local run

From repository root:

```bash
pip install -e core
pip install -r backend/requirements.txt
```

```powershell
$env:PYTHONPATH = "core/src;backend"
$env:DATA_DIR = "./data"
python backend/app/main.py
```

API: http://localhost:8000

## Tests

```bash
pytest tests/test_api_chat.py tests/test_api_sessions.py -v
```

## Docker

Built via `deployment/docker/backend.Dockerfile`. Entrypoint: `python backend/app/main.py`.

Environment in `docker-compose.yml`: `OLLAMA_URL`, `TTS_URL`, `WHISPER_URL`.
