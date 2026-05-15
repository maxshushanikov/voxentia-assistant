# 🤖 Voxentia – KI-Digitalassistent

> **Ein premium, vollständig lokales KI-Avatar-System** mit Echtzeit-3D-Rendering, Multimodaler Vision, mehrsprachiger Sprachinteraktion und dokumentenbasiertem Wissen. 100% Privat. 100% Lokal.

**[🇬🇧 English Version](README.md) | [🇷🇺 Русская версия](README_RU.md)**

---

## ✨ Funktionen & Highlights

Voxentia ist als hochwertiger persönlicher Assistent konzipiert, der vollständig auf deiner eigenen Hardware läuft und eine moderne, modulare Architektur nutzt.

| Funktion | Beschreibung |
|---|---|
| 🧠 **Lokales LLM** | Betrieben von [Ollama](https://ollama.com/) (Standard: `phi3`) — läuft lokal mit hoher Performance. |
| ⚛️ **Modernes React UI** | Professionelles Frontend basierend auf React, Vite und Tailwind CSS. Modulare Struktur für maximale Erweiterbarkeit. |
| 🎭 **Persona-System** | Wähle zwischen **Professionellem Assistenten**, **Freundlichem Begleiter** und **Akademischem Tutor**. |
| 🎙️ **Mehrsprachige Stimme** | Integriertes STT (Whisper) und TTS (Silero) für Deutsch, Englisch und Russisch mit Lippensynchronisation. |
| 🧍 **3D Digitaler Avatar** | Echtzeit-Rendering via [Three.js](https://threejs.org/) mit dynamischem Geschlechterwechsel je nach Stimme. |
| 📄 **Dokumenten-KI** | PDF-Upload für sofortige RAG-Analysen (Retrieval-Augmented Generation) via ChromaDB. |
| 🔌 **Plugin-Architektur** | Modulares Backend zur einfachen Erweiterung durch eigene Tools (Kalender, Notizen etc.). |
| 🔒 **Privacy First** | Alle Dienste laufen in Docker-Containern. Keine Cloud-API-Aufrufe, keine Telemetrie. |

---

## 🏗️ Technische Architektur

Voxentia nutzt eine professionelle Microservices-Architektur, die über Docker Compose koordiniert wird.

```text
voxentia-assistant/
├── backend/app/                # FastAPI — Kernlogik & Orchestrierung
│   ├── api/                    # Versionierte REST-Endpunkte (v1)
│   ├── core/                   # Pydantic Settings, Datenbank & Sicherheit
│   ├── models/                 # SQLAlchemy Datenbank-Modelle
│   ├── schemas/                # Pydantic Schemas für API-Validierung
│   └── services/               # Geschäftslogik (Chat, Stimme, RAG)
│
├── frontend/                   # React — Modulare Web-Applikation
│   ├── src/components/         # Dekomponierte UI-Komponenten (Sidebar, Chat, Avatar)
│   ├── src/hooks/              # Custom React Hooks (Audio Manager etc.)
│   └── src/types/              # Gemeinsame TypeScript Definitionen
│
├── core/                       # Shared Python Framework (Plugin-System)
├── tts-server/                 # Silero TTS Engine (Flask Wrapper)
├── whisper-server/             # faster-whisper STT Engine (Flask Wrapper)
├── data/                       # Persistenz: Vektor-DB, Chat-History, Audio-Cache
└── assets/                     # Statische Medien: 3D-Modelle (.glb), Texturen
```

---

## 🚀 Schnellstart (Installation)

### Voraussetzungen
- **Docker Desktop** (mit Compose v2+)
- **Windows / Linux / macOS**
- **Ollama** lokal installiert.

### 1. Setup & Start (Windows)
Nutze unser natives Windows-Steuerungsskript für eine einfache Bedienung:
```powershell
# Abhängigkeiten installieren
.\run.bat install

# Kompletten Stack starten
.\run.bat up
```

### 2. Setup & Start (Linux/macOS)
```bash
# Docker Stack starten
make docker-up
```

Öffne das Interface unter: **`http://localhost:80`** (Nginx) oder **`http://localhost:8000`** (Backend Dev).

---

## 🛠️ Konfiguration

### Umgebungsvariablen (.env)
| Variable | Standard | Beschreibung |
|---|---|---|
| `DEFAULT_MODEL` | `phi3` | Das LLM für den Chat. |
| `DEFAULT_LANGUAGE` | `de` | Standardsprache (en, de, ru). |
| `OLLAMA_URL` | `http://ollama:11434` | URL zum Ollama Container/Dienst. |

---

## 🎮 Interface-Guide

- **Settings-Dropdown**: Ändere Sprache, Stimme und Persönlichkeit sofort im Header.
- **Mikrofon**: Klicke auf das Mic-Icon, um mit Voxentia zu sprechen.
- **Avatar**: Wechselt automatisch das Geschlecht basierend auf dem gewählten Sprecher.

---

## 📄 Lizenz
MIT-Lizenz — 2026 Voxentia Project.
Intelligence Localized.
