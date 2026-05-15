# 🌌 Voxentia: Your Modular AI Assistant

> **A premium, fully local AI digital assistant** featuring real-time 3D rendering, multimodal vision, multilingual speech interaction, and document-based knowledge. 100% Private. 100% Local.

**[🇩🇪 Deutsche Version](README_DE.md) | [🇷🇺 Русская версия](README_RU.md)**

---

## ✨ Features & Highlights

Voxentia is designed as a high-end personal assistant that runs entirely on your own hardware using a modern, modular architecture.

| Feature | Description |
|---|---|
| 🧠 **Local LLM** | Powered by [Ollama](https://ollama.com/) — runs locally with high performance (Default: `phi3`). |
| ⚛️ **Modern React UI** | Professional, modular frontend built with React, Vite, and Tailwind CSS. Features "Glassmorphism" design and smooth transitions. |
| 🎭 **Persona System** | Switch between **Professional Assistant**, **Friendly Companion**, and **Academic Tutor** to customize behavior. |
| 🎙️ **Multilingual Voice** | Integrated STT (Whisper) and TTS (Silero) supporting English, German, and Russian with synchronized lip-sync. |
| 🧍 **3D Digital Avatar** | Real-time rendering via [Three.js](https://threejs.org/) with procedural animations and dynamic gender-switching based on voice. |
| 📄 **Document Intelligence** | Upload PDFs for instant RAG (Retrieval-Augmented Generation) analysis via ChromaDB. |
| 🔌 **Plugin Architecture** | Modular backend allowing easy expansion with custom tools (Calendar, Notes, etc.). |
| 🔒 **Privacy First** | All services run in Docker containers. No telemetry, no cloud API calls, and no data tracking. |

---

## 🏗️ Technical Architecture

Voxentia follows a professional microservices architecture coordinated via Docker Compose.

```text
voxentia-assistant/
├── backend/app/                # FastAPI — Core Logic & Orchestration
│   ├── api/                    # Versioned REST endpoints (v1)
│   ├── core/                   # Pydantic Settings, Database & Security
│   ├── models/                 # SQLAlchemy Persistence Models
│   ├── schemas/                # Pydantic Schemas for API validation
│   └── services/               # Business Logic (Chat, Voice, RAG)
│
├── frontend/                   # React — Modular Web Application
│   ├── src/components/         # Decomposed UI components (Sidebar, Chat, Avatar)
│   ├── src/hooks/              # Custom React hooks (Audio Manager, etc.)
│   └── src/types/              # Shared TypeScript definitions
│
├── core/                       # Shared Python Framework (Plugin-System)
├── tts-server/                 # Silero TTS Engine (Flask Wrapper)
├── whisper-server/             # faster-whisper STT Engine (Flask Wrapper)
├── data/                       # Persistence: Vektor-DB, Chat-History, Audio Cache
└── assets/                     # Static Media: 3D Models (.glb), Textures
```

---

## 🚀 Quick Start (Installation)

### Prerequisites
- **Docker Desktop** (with Compose v2+)
- **Windows / Linux / macOS**
- **Ollama** installed locally.

### 1. Setup & Launch (Windows)
We provide a native Windows control script for ease of use:
```powershell
# Install dependencies
.\run.bat install

# Start the complete stack
.\run.bat up
```

### 2. Setup & Launch (Linux/macOS)
```bash
# Start Docker stack
make docker-up
```

Open the interface at: **`http://localhost:80`** (Nginx) or **`http://localhost:8000`** (Backend Dev).

---

## 🛠️ Configuration

### Environment Variables (.env)
| Variable | Default | Description |
|---|---|---|
| `DEFAULT_MODEL` | `phi3` | The LLM used for chat. |
| `DEFAULT_LANGUAGE` | `en` | Default language (en, de, ru). |
| `OLLAMA_URL` | `http://ollama:11434` | URL to Ollama container/service. |

---

## 🎮 Interface Guide

- **Settings Dropdown**: Change Language, Voice, and Personality instantly in the header.
- **Microphone**: Click the mic icon to talk to Voxentia.
- **Avatar**: Automatically switches gender based on the selected speaker.

---

## 📄 License
MIT License — 2026 Voxentia Project.
Intelligence Localized.