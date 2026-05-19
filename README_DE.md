# Voxentia — Modularer lokaler KI-Assistent

> Ein datenschutzfreundlicher Digitalassistent mit 3D-Avatar, Sprachsteuerung, Dokumenten-RAG und Plugin-Architektur. Läuft vollständig auf Ihrer Hardware via Docker.

**Sprachen:** [English](README.md) · [Русский](README_RU.md)

---

## Überblick

Voxentia verbindet ein **React + Three.js** Frontend, ein **FastAPI** Backend, den **voxentia-core** Orchestrator und optionale **Plugins** (Kalender, Jobs, Lernen, Dokumente). Sprache nutzt **Ollama** (LLM), **Whisper** (STT) und **Silero** (TTS). PDFs werden in **ChromaDB** für RAG-Antworten indexiert.

| Eigenschaft | Wert |
|-----------|------|
| Standard-LLM | `phi3` (über Ollama) |
| Sprachen | Deutsch, Englisch, Russisch |
| API | `/api/v1` (+ Legacy `/api`) |
| UI | http://localhost (Nginx) oder Vite-Dev :5173 |

---

## Funktionen

| Bereich | Details |
|---------|---------|
| **Chat** | Sitzungsbasierte Historie, Persönlichkeiten, Modellwahl |
| **Stimme** | Mikrofon → Whisper; Antworten → Silero TTS mit Lippensync |
| **Avatar** | GLB-Modelle, automatisch zentriert und skaliert |
| **Dokumente** | PDF-Upload → RAG-Kontext im Chat |
| **Plugins** | Erweiterungen über `plugin_config.json` |
| **Historie** | Nach Zeitraum gruppiert; Vorschau; **Chats löschen** (einzeln oder alle) |
| **Betrieb** | Healthchecks, Rate-Limiting, Request-IDs, Logging |

---

## Architektur

```text
Browser (React) → Nginx (:80) → FastAPI (:8000)
                                    ├── SQLite (Chat, WAL)
                                    ├── ChromaDB (Dokumente)
                                    ├── voxentia-core + Plugins
                                    ├── Ollama — LLM
                                    ├── tts-server — Silero
                                    └── whisper-server — STT
```

### Projektstruktur

```text
voxentia-assistant/
├── backend/app/      # FastAPI (kanonische API)
├── core/             # voxentia-core
├── frontend/         # React UI
├── plugins/          # Python-Plugins
├── i18n/locales/     # UI-Texte (de, en, ru)
├── tts-server/       # TTS-Microservice
├── whisper-server/   # STT-Microservice
└── data/             # Laufzeitdaten (nicht in Git)
```

---

## Voraussetzungen

- **Docker Desktop** mit Compose v2
- **8 GB+ RAM** empfohlen
- **GPU** optional

---

## Schnellstart

### Windows

```powershell
.\run.bat up
# oder
docker compose up --build
```

### Linux / macOS

```bash
docker compose up --build
```

Öffnen: **http://localhost**

Entwicklung Frontend:

```bash
cd frontend && npm install && npm run dev
```

---

## Konfiguration

`.env.example` nach `.env` kopieren.

| Variable | Standard | Beschreibung |
|----------|----------|--------------|
| `DEFAULT_MODEL` | `phi3` | Ollama-Modell |
| `DEFAULT_LANGUAGE` | `de` | Standardsprache |
| `OLLAMA_URL` | `http://ollama:11434` | Ollama-URL |
| `TTS_URL` | `http://tts-server:5002` | TTS-Dienst |
| `WHISPER_URL` | `http://whisper-server:5003` | STT-Dienst |
| `RATE_LIMIT` | `60/minute` | API-Limit |
| `TTS_TIMEOUT` | `120` | TTS-Timeout (Sekunden) |

Plugins: `backend/app/core/config/plugin_config.json`

---

## API (Auszug)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `POST` | `/api/v1/chat` | Nachricht senden |
| `GET` | `/api/v1/sessions` | Sitzungen auflisten |
| `DELETE` | `/api/v1/sessions/{id}` | Einen Chat löschen |
| `DELETE` | `/api/v1/sessions` | Alle Chats löschen |
| `POST` | `/api/v1/documents/upload` | PDF indexieren |

Dokumentation: **http://localhost:8000/docs**

---

## Entwicklung

```bash
pip install -e core && pip install -r backend/requirements.txt -r requirements-dev.txt
pytest tests/ -v
```

```bash
cd frontend && npm install && npm run test && npm run build
```

OpenAPI-Typen aktualisieren:

```bash
python scripts/export_openapi.py
cd frontend && npm run generate:api
```

---

## Bedienung

- **Sidebar — Plugins:** Kalender, Jobs, Dokumente, …
- **Sidebar — Historie:** Vorschau der letzten Chats; **Alle anzeigen** für die vollständige Liste; Papierkorb zum Löschen.
- **Kopfzeile:** Sprache, Stimme, Persönlichkeit.
- **Avatar:** Zentriert, volle Sichtbarkeit im Panel.

---

## Fehlerbehebung

| Problem | Prüfen |
|---------|--------|
| Keine Stimme | `docker compose ps` (tts-server healthy); Backend-Logs; Browser-Konsole |
| Ollama | `docker compose logs ollama-init` |
| Build Frontend | `npm ci` in `frontend/` (`.npmrc` mit legacy-peer-deps) |

---

## Lizenz

MIT-Lizenz — © 2026 Voxentia Project.
