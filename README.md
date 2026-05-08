# 🤖 Voxentia – AI Digital Assistant

> **A premium, fully local AI avatar system** with real-time 3D rendering, multimodal vision, multilingual voice interaction, and document-based intelligence. 100% private. 100% local.

**[🇷🇺 Русская версия](README_RU.md) | [🇩🇪 Deutsche Version](README_DE.md)**

---

## ✨ Features & Capabilities

Voxentia is designed to be a high-end personal assistant that runs entirely on your own hardware using a modern, modular architecture.

| Feature | Description |
|---|---|
| 🧠 **Local LLM** | Powered by [Ollama](https://ollama.com/) (default: `phi3`) — runs locally with high reasoning performance. |
| 🎨 **Premium UI** | Modern "Claude-meets-Material-You" interface. Floating glass panels, responsive navigation rail, and smooth micro-animations. |
| 🎭 **Persona Engine** | Choose between **Expert Advisor**, **Friendly Companion**, and **Academic Tutor** roles that adapt the assistant's behavior. |
| 🎙️ **Zero-Latency Voice** | Integrated [faster-whisper](https://github.com/SYSTRAN/faster-whisper) for STT and [Silero TTS](https://github.com/snakers4/silero-models) for multilingual speech synthesis. |
| 🧍 **3D Digital Avatar** | Real-time [Three.js](https://threejs.org/) rendering with procedural animations, lip-sync, and manual emotion control. |
| 📄 **Document Intelligence** | Upload PDFs for instant RAG (Retrieval-Augmented Generation) analysis via [ChromaDB](https://www.trychroma.com/). |
| 🔍 **Web Search Tool** | Integrated search capability allows the assistant to fetch real-time information when enabled. |
| 📹 **Multimodal Vision** | Webcam integration allowing the assistant to "see" and describe its environment or the user. |
| 🔒 **Privacy First** | All services run in Docker containers. No telemetry, no cloud API calls, and no data tracking. |

---

## 🏗️ Technical Architecture

Voxentia is built on a distributed microservices architecture coordinated via Docker Compose.

```
voxentia-assistant/
├── backend/                    # FastAPI — Core Logic & Orchestration
│   ├── api/                    # REST Endpoints (Chat, Docs, Transcribe, WebRTC)
│   ├── core/                   # Config, Database setup, and System Prompts
│   ├── models/                 # Pydantic schemas for API validation
│   └── services/
│       ├── llm.py              # Ollama interaction (Phi3/Llava) + Tool calling
│       ├── tools.py            # Tool definitions (Search, Weather, Time)
│       ├── tts.py              # Silero TTS synthesis client logic
│       └── rag.py              # Document parsing & Vector search (ChromaDB)
│
├── frontend/                   # Vanilla JS — Modular Web-App
│   ├── index.html              # MD3 layout & Entry point
│   └── static/
│       ├── main.js             # App controller & lifecycle
│       ├── components/         # UI modules (Chat panels, navigation)
│       ├── modules/            # Engine logic (Three.js scene, Avatar, Audio)
│       ├── stores/             # Global state management
│       ├── utils/              # API helpers, WebRTC & Formatting
│       └── styles/             # Modular CSS styles
│
├── tts-server/                 # Silero TTS Engine (Flask wrapper)
├── whisper-server/             # faster-whisper STT Engine (Flask wrapper)
├── data/                       # Persistence: Vector DB, History, Documents
└── assets/                     # Static media: 3D models (.glb), Textures
```

---

## 🚀 Quick Start (Installation)

### Prerequisites
- **Docker Desktop** (with Compose v2+)
- **NVIDIA GPU** (Optional, for better performance, but works on CPU)
- **Minimum 8GB RAM** (16GB recommended)

### 1. Clone & Setup
```bash
git clone <your-repo-url>
cd digital_avatar
cp .env.example .env
```

### 2. Pull AI Models
```bash
# Start Ollama
docker compose up ollama -d

# Pull necessary models
docker exec -it digital_avatar-ollama-1 ollama pull phi3
docker exec -it digital_avatar-ollama-1 ollama pull nomic-embed-text
```

### 3. Launch System
```bash
docker compose up --build
```
Access the interface at: **`http://localhost:8000`**

---

## 🎮 Interface Guide

### Responsive Navigation Rail
The sidebar on the left provides quick access to core functions:
- 🏠 **Home**: Reset current session.
- 📄 **Upload**: Attach documents for the AI to analyze.
- 📹 **Video Call**: Activate immersive communication mode.
- 📷 **Camera**: Toggle webcam for vision tasks.
- 🔊 **Test Sound**: Verify audio output and resume context.

### Chat Sidebar (Claude-Style)
A clean, premium panel for text interaction:
- **Speaker Selection**: Choose between 4 distinct voices (Baya, Kseniya, Eugene, Aidar).
- **Language Selection**: Toggle between English, German, and Russian on the fly.
- **Persona Dropdown**: Change the AI's personality instantly.
- **Search Toggle**: Enable/Disable real-time web search capabilities.

---

## 🛠️ Configuration & Customization

### Environment Variables (.env)
| Variable | Default | Purpose |
|---|---|---|
| `DEFAULT_MODEL` | `phi3` | The LLM used for chat. |
| `DEFAULT_LANGUAGE` | `en` | Initial UI and logic language. |
| `OLLAMA_TIMEOUT` | `120` | Max wait time for LLM response. |

### Adding Custom Personalities
Edit `backend/core/config.py` to add new roles. Each personality supports localized system prompts for all supported languages.

---

## 🔍 Troubleshooting

| Issue | Solution |
|---|---|
| **NotReadableError** (Mic) | Close other apps using the mic. Voxentia will auto-retry. |
| **No Voice Output** | Click the "Test Sound" button to wake up the browser audio context. |
| **Long Latency** | Ensure your machine has enough RAM. Try the `tiny` whisper model in `docker-compose.yml`. |
| **Prompt Leakage** | Ensure you are using the latest `llm.py` with the updated stop-tokens. |

---

## 🗺️ Roadmap v6.0
- [ ] **Viseme-based Lip Sync**: Advanced mouth movements synchronized with audio phonemes.
- [ ] **Emotion Detection**: Real-time facial expression analysis from webcam.
- [ ] **Long-Term Memory**: Database-backed user profile persistence.
- [ ] **Plugin System**: Easy integration of custom tools and API connectors.

---

## 📄 License
MIT License — 2026 Voxentia Project.