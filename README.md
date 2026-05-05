# 🤖 Voxentia – AI Digital Assistant

> **A fully local, privacy-first AI avatar system** with real-time 3D rendering, multilingual voice interaction, speech recognition, and document-based knowledge retrieval. No cloud services. No data leaves your machine.

**[🇷🇺 Русская версия](README_RU.md) | [🇩🇪 Deutsche Version](README_DE.md)**

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 **Local LLM** | Powered by [Ollama](https://ollama.com/) with `phi3` — runs 100% on your hardware |
| 🎨 **MD3 Interface** | Modern **Material Design 3** UI with Navigation Rail, Top App Bar, and professional iconography |
| 🎭 **Persona System** | Dynamic personality switching: **Expert Advisor**, **Friendly Companion**, and **Academic Tutor** |
| 🛠️ **Tool-Use Ready** | Architecture supports external tool calls (e.g., search, weather) integrated into LLM reasoning |
| 🎙️ **Local STT** | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) — `base` model, multilingual speech recognition |
| 🔊 **Local TTS** | [Silero TTS](https://github.com/snakers4/silero-models) — High-quality EN / DE / RU voices |
| 🧍 **3D Avatar** | Real-time [Three.js](https://threejs.org/) rendering with lip-sync and manual expression control |
| 📄 **Doc Knowledge** | PDF upload & RAG support via [ChromaDB](https://www.trychroma.com/) |
| 🔒 **100% Private** | All AI services run in Docker containers — zero data leaves your local machine |

---

## 🏗️ Architecture

```
digital_avatar/
├── backend/                    # FastAPI — API Gateway & Services
│   ├── api/                    # REST Endpoints (Chat, Docs, Transcribe)
│   ├── services/
│   │   ├── llm.py              # Ollama client + Tool-Use Loop logic
│   │   ├── tools.py            # Registered Tool definitions (Weather, Search)
│   │   ├── tts.py              # TTS synthesis client
│   │   └── rag.py              # ChromaDB vector search service
│   └── core/                   # Config, Database, Personality Prompts
│
├── frontend/                   # Vanilla JS — Modular Web App (MD3)
│   ├── index.html              # Modern Rail-based layout
│   └── static/
│       ├── main.js             # I18n & App Lifecycle management
│       ├── components/         # Chat & UI Control components
│       └── modules/            # Three.js (Avatar), WebAudio (Audio), State
│
├── tts-server/                 # Silero TTS Service (Local Python container)
└── whisper-server/             # faster-whisper STT Service (Local Python container)
```

---

## 🐳 Services Overview

| Service | Port | Technology | Purpose |
|---|---|---|---|
| `avatar-server` | 8000 | FastAPI + Python | Main backend, serves frontend |
| `tts-server` | 5002 | Flask + Silero | Text-to-Speech synthesis |
| `whisper-server` | 5003 | Flask + faster-whisper | Speech-to-Text recognition |
| `ollama` | 11434 | Ollama | Local LLM inference |

---

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (with Docker Compose v2+)
- **~6 GB RAM** available for all services
- **~3 GB disk space** for models and containers
- Modern browser with WebGL support (Chrome, Firefox, Edge)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd digital_avatar
```

### 2. Pull the LLM model (first time only)

```bash
# Start Ollama container first
docker compose up ollama -d

# Pull the default language model
docker exec -it digital_avatar-ollama-1 ollama pull phi3

# Pull the embedding model for RAG (document search)
docker exec -it digital_avatar-ollama-1 ollama pull nomic-embed-text
```

### 3. Build and launch all services

```bash
docker compose up --build
```

> ⏳ **First launch takes 5–10 minutes** — Docker builds images and Whisper downloads its model (~150MB).

### 4. Open in browser

```
http://localhost:8000
```

---

## 🎮 Using Voxentia

### Language Selection
On the start screen, choose **EN**, **DE**, or **RU** before clicking Start. This sets the language for the UI, the LLM system prompt, and the TTS voice.

### Controls Bar

| Button | Action |
|---|---|
| 🏠 **Start** | Return to start screen to change language |
| 🎙️ **Talk** | Click to start recording → click again to stop & transcribe |
| 🔊 **Test Sound** | Verify your audio output is working |
| 📹 **Video Call** | Toggle video call mode |
| 📷 **Camera** | Enable webcam |
| 📄 **Upload** | Upload a PDF document for the avatar to learn from |
| Voice dropdown | Select from 4 voices (Baya, Kseniya, Eugene, Aidar) |
| Emoji dropdown | Manually trigger facial expressions |

### Voice Input (Whisper)
1. Click **🎙️ Talk** — microphone activates
2. Speak your message clearly
3. Click **🎙️ Talk** again — audio is sent to local Whisper
4. Transcription appears in chat → avatar responds

### Document Upload (RAG)
1. Click **📄 Upload** and select any PDF file
2. Wait for **✅ OK** confirmation
3. Ask the avatar questions about the document content
4. The avatar will retrieve relevant passages and answer based on them

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file (copy from `.env.example`):

```env
# LLM Settings
DEFAULT_MODEL=phi3
OLLAMA_TIMEOUT=120

# Language
DEFAULT_LANGUAGE=en

# Service URLs (internal Docker network)
OLLAMA_URL=http://ollama:11434
TTS_URL=http://tts-server:5002
WHISPER_URL=http://whisper-server:5003
```

### Whisper Model Size

Edit `docker-compose.yml` to change the Whisper model for speed vs accuracy:

```yaml
whisper-server:
  environment:
    - WHISPER_MODEL=base   # Options: tiny, base, small, medium, large-v3
```

| Model | Size | Speed | Accuracy |
|---|---|---|---|
| `tiny` | ~75 MB | Fastest | Good |
| `base` | ~145 MB | Fast | Better ✅ default |
| `small` | ~460 MB | Medium | Great |
| `medium` | ~1.5 GB | Slow | Excellent |

### Available TTS Voices

| Voice ID | Language | Gender |
|---|---|---|
| `baya` | RU/EN/DE | Female |
| `kseniya` | RU/EN/DE | Female |
| `eugene` | RU/EN/DE | Male |
| `aidar` | RU/EN/DE | Male |

The voice is automatically mapped to the correct Silero speaker for each language.

---

## 🛠️ Development

### Frontend Module System

All frontend modules use native ES Modules (no bundler required):

```javascript
// State management - reactive store
import { appState } from './modules/core/State.js';
appState.update('language', 'de');
appState.subscribe('language', (val) => console.log('Lang changed:', val));

// i18n
import { i18n } from './modules/core/I18n.js';
i18n.setLanguage('ru');
i18n.t('send_btn'); // → 'Отправить'
```

### Adding a New Language

1. Add translations to `frontend/static/modules/core/I18n.js`
2. Add voices to `frontend/static/modules/core/State.js`
3. Add a `lang-btn` in `frontend/index.html`
4. Add a system prompt in `backend/core/config.py`
5. Add the language code to `whisper-server/server.py` → `LANG_MAP`

### Rebuilding after code changes

```bash
# Rebuild only the backend
docker compose up -d --build avatar-server

# Rebuild only TTS server
docker compose up -d --build tts-server

# Rebuild Whisper server
docker compose up -d --build whisper-server

# Full rebuild
docker compose up --build
```

### Browser Cache

After frontend changes, always hard-reload:
- **Windows/Linux**: `Ctrl + Shift + R`
- **macOS**: `Cmd + Shift + R`

---

## 🔍 Diagnostics & Troubleshooting

### View service logs

```bash
docker logs digital_avatar-avatar-server-1
docker logs digital_avatar-tts-server-1
docker logs digital_avatar-whisper-server-1
docker logs digital_avatar-ollama-1
```

### Common issues

| Problem | Cause | Solution |
|---|---|---|
| No audio output | Browser audio blocked | Click **🔊 Test Sound** first |
| Mic Error (NotReadable) | Hardware lock | App automatically attempts a "Nuclear Reset" — just wait 2 seconds |
| Avatar in T-pose | No idle animation found | Check console — animations must be in `assets/idle/` |
| TTS silent on EN/DE | Old container cached | `docker compose up -d --build tts-server` |
| Upload gives 405 | Backend not rebuilt | `docker compose up -d --build avatar-server` |
| Mic shows ⏳ forever | Whisper still loading | Check `docker logs digital_avatar-whisper-server-1` |

### Browser Console Logs

Open DevTools (`F12`) → Console:
- `🚀 VOXENTIA AI SYSTEM v3.0 LOADED` — app initialized
- `⚠️ AudioManager: NotReadableError` — hardware lock detected
- `[State Update]` — reactive state changes
- `📂 Loading N variations...` — avatar animation loading
- `🎙️ Transcribed [de]:` — Whisper output

---

## 🗺️ Roadmap

- [x] **Material Design 3 UI** — Navigation Rail, Outlined FABs, and clean typography
- [x] **Tool Use Integration** — LLM can now reason and execute internal Python functions
- [x] **Streaming responses** — Word-by-word LLM output for zero-latency feel
- [x] **Persona Engine** — Switch between Expert, Friendly, and Academic roles
- [ ] **Vision (Webcam)** — Real-time mood detection to adapt the avatar's response
- [ ] **Advanced lip-sync** — Viseme-based mouth shapes from audio waveform
- [ ] **Long-term Memory** — Personalized RAG to remember user context across sessions

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request