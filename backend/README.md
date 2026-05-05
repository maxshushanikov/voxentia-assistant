# ⚙️ Voxentia Backend

This directory contains the main API Gateway and the core logic for the AI Digital Assistant.

## 🚀 Technology Stack
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous Python)
- **LLM Client**: [Ollama](https://ollama.com/) (local inference)
- **Vector DB**: [ChromaDB](https://www.trychroma.com/) (for RAG)
- **Database**: SQLite (for chat history)
- **Communication**: HTTPX (async requests to TTS/Whisper/Ollama)

## 📂 Directory Structure

```
backend/
├── api/                    # API Endpoints
│   ├── chat.py             # Main streaming chat logic
│   ├── documents.py        # PDF processing & RAG management
│   └── transcribe.py       # Proxy for local Whisper STT
│
├── services/               # Internal AI Service Clients
│   ├── llm.py              # LLM integration with Tool-Use Loop
│   ├── tools.py            # Definition of Python tools for the LLM
│   ├── tts.py              # Text-to-Speech synthesis client
│   └── rag.py              # ChromaDB document indexing & search
│
└── core/                   # Shared logic & Configuration
    ├── config.py           # Environment variables & Persona Prompts
    └── database.py         # Chat persistence (SQLAlchemy/SQLite)
```

## 🛠️ Key Concepts

### 1. Tool-Use Loop
The `llm.py` service implements a recursive loop that allows the model to output `[TOOL: name(args)]`. The backend intercepts this, executes the corresponding Python function in `services/tools.py`, and feeds the result back to the LLM for a final response.

### 2. Persona Injection
System prompts for different personas (Expert, Friendly, Tutor) are defined in `core/config.py`. When a request comes in with a `personality` parameter, the corresponding instructions are injected into the message history.

### 3. RAG Pipeline
PDFs are processed using `pypdf`, split into chunks, embedded using `nomic-embed-text` (via Ollama), and stored in ChromaDB. During chat, relevant context is retrieved and prepended to the LLM prompt.

## 🖥️ Running Locally (without Docker)

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set environment variables in `.env`.
4. Start the server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
