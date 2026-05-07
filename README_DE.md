# 🤖 Voxentia – KI-Digitalassistent

> **Ein premium, vollständig lokales KI-Avatar-System** mit Echtzeit-3D-Rendering, Multimodaler Vision, mehrsprachiger Sprachinteraktion und dokumentenbasiertem Wissen. 100% Privat. 100% Lokal.

**[🇬🇧 English Version](README.md) | [🇷🇺 Русская версия](README_RU.md)**

---

## ✨ Funktionen & Highlights

Voxentia ist als hochwertiger persönlicher Assistent konzipiert, der vollständig auf deiner eigenen Hardware läuft und eine moderne, modulare Architektur nutzt.

| Funktion | Beschreibung |
|---|---|
| 🧠 **Lokales LLM** | Betrieben von [Ollama](https://ollama.com/) (Standard: `phi3`) — läuft lokal mit hoher Performance. |
| 🎨 **Premium UI** | Modernes "Claude-meets-Material-You" Interface. Schwebende Glas-Paneele, responsive Navigation Rail und flüssige Mikro-Animationen. |
| 🎭 **Persona-System** | Wähle zwischen **Experten-Berater**, **Freundlichem Begleiter** und **Akademischem Tutor**, um das Verhalten anzupassen. |
| 🎙️ **Latenzfreie Stimme** | Integriertes [faster-whisper](https://github.com/SYSTRAN/faster-whisper) für STT und [Silero TTS](https://github.com/snakers4/silero-models) für mehrsprachige Sprachsynthese. |
| 🧍 **3D Digitaler Avatar** | Echtzeit-Rendering via [Three.js](https://threejs.org/) mit prozeduralen Animationen, Lip-Sync und manueller Mimik-Steuerung. |
| 📄 **Dokumenten-KI** | PDF-Upload für sofortige RAG-Analysen (Retrieval-Augmented Generation) via [ChromaDB](https://www.trychroma.com/). |
| 🔍 **Websuche-Tool** | Integrierte Suchfunktion ermöglicht es dem Assistenten, Echtzeit-Informationen abzurufen. |
| 📹 **Multimodale Vision** | Webcam-Integration, die es dem Assistenten ermöglicht, seine Umgebung oder den Benutzer zu "sehen" und zu beschreiben. |
| 🔒 **Privacy First** | Alle Dienste laufen in Docker-Containern. Keine Telemetrie, keine Cloud-API-Aufrufe und kein Datentracking. |

---

## 🏗️ Technische Architektur

Voxentia basiert auf einer verteilten Microservices-Architektur, die über Docker Compose koordiniert wird.

```
digital_avatar/
├── backend/                    # FastAPI — Kernlogik & Orchestrierung
│   ├── api/                    # REST-Endpunkte (Chat, Dokumente, Transkription)
│   ├── services/
│   │   ├── llm.py              # Ollama-Interaktion + Prompt-Engineering + Stop-Tokens
│   │   ├── tools.py            # Tool-Definitionen (Suche, Wetter, Zeit)
│   │   ├── tts.py              # TTS-Synthese Client-Logik
│   │   └── rag.py              # Vektoreinbettung & Abruf via ChromaDB
│   └── core/                   # Konfig, Datenbank & mehrsprachige System-Prompts
│
├── frontend/                   # Vanilla JS — Modulare Web-App
│   ├── index.html              # Responsives MD3-Layout (Rail + Sidebar)
│   └── static/
│       ├── main.js             # App-Lebenszyklus & I18n-Initialisierung
│       ├── components/         # Modulare UI (Chat, Controls, Sidebar)
│       └── modules/            # Engine-Module (Avatar, Audio, State, Scene)
```

---

## 🚀 Schnellstart (Installation)

### Voraussetzungen
- **Docker Desktop** (mit Compose v2+)
- **NVIDIA GPU** (Optional, für bessere Performance, läuft aber auch auf CPU)
- **Mindestens 8GB RAM** (16GB empfohlen)

### 1. Klonen & Setup
```bash
git clone <deine-repo-url>
cd digital_avatar
cp .env.example .env
```

### 2. KI-Modelle laden
```bash
# Ollama starten
docker compose up ollama -d

# Benötigte Modelle laden
docker exec -it digital_avatar-ollama-1 ollama pull phi3
docker exec -it digital_avatar-ollama-1 ollama pull nomic-embed-text
```

### 3. System starten
```bash
docker compose up --build
```
Öffne das Interface unter: **`http://localhost:8000`**

---

## 🎮 Interface-Guide

### Responsive Navigation Rail
Die Sidebar auf der linken Seite bietet schnellen Zugriff auf Kernfunktionen:
- 🏠 **Home**: Aktuelle Session zurücksetzen.
- 📄 **Upload**: Dokumente für die KI-Analyse anhängen.
- 📹 **Video Call**: Immersiven Kommunikationsmodus aktivieren.
- 📷 **Kamera**: Webcam für Vision-Aufgaben umschalten.
- 🔊 **Audio-Test**: Audioausgabe prüfen und Kontext reaktivieren.

### Chat-Sidebar (Claude-Stil)
Ein sauberes, hochwertiges Panel für Textinteraktionen:
- **Sprecher-Auswahl**: Wähle zwischen 4 verschiedenen Stimmen (Baya, Kseniya, Eugene, Aidar).
- **Sprach-Auswahl**: Wechsle im laufenden Betrieb zwischen Englisch, Deutsch und Russisch.
- **Persona-Dropdown**: Ändere die Persönlichkeit der KI sofort.
- **Suche umschalten**: Echtzeit-Websuche aktivieren/deaktivieren.

---

## 🔍 Fehlerbehebung

| Problem | Lösung |
|---|---|
| **NotReadableError** (Mikro) | Schließe andere Apps, die das Mikro nutzen. Voxentia versucht es automatisch erneut. |
| **Keine Sprachausgabe** | Klicke auf "Audio-Test", um den Audio-Kontext des Browsers zu wecken. |
| **Hohe Latenz** | Stelle sicher, dass genug RAM vorhanden ist. Nutze ggf. das `tiny` Whisper-Modell in `docker-compose.yml`. |
| **Prompt Leakage** | Stelle sicher, dass du die neueste `llm.py` mit den aktualisierten Stop-Tokens nutzt. |

---

## 🗺️ Roadmap v6.0
- [ ] **Visem-basiertes Lip-Sync**: Fortschrittliche Mundbewegungen synchron zu Audio-Phonemen.
- [ ] **Emotionserkennung**: Echtzeit-Gesichtsanalyse via Webcam.
- [ ] **Langzeitgedächtnis**: Datenbankgestützte Speicherung von Benutzerprofilen.
- [ ] **Plugin-System**: Einfache Integration von eigenen Tools und API-Connectoren.

---

## 📄 Lizenz
MIT-Lizenz — 2026 Voxentia Project.
