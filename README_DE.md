# 🤖 Voxentia – KI-Digitalassistent

> **Ein vollständig lokales, datenschutzfreundliches KI-Avatar-System** mit Echtzeit-3D-Rendering, mehrsprachiger Sprachinteraktion, Spracherkennung und dokumentenbasiertem Wissenssystem. Keine Cloud-Dienste. Keine Daten verlassen deinen Computer.

**[🇬🇧 English Version](README.md) | [🇷🇺 Русская версия](README_RU.md)**

---

## ✨ Funktionen

| Funktion | Beschreibung |
|---|---|
| 🧠 **Lokales LLM** | Betrieben von [Ollama](https://ollama.com/) mit `phi3` (austauschbar) — läuft 100% auf deiner Hardware |
| 🎙️ **Lokale Spracherkennung** | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) — `base`-Modell, mehrsprachig, kein Google/Apple |
| 🔊 **Lokale Sprachsynthese** | [Silero TTS](https://github.com/snakers4/silero-models) — Russische, englische und deutsche Stimmen |
| 🧍 **3D-Avatar** | Echtzeit-Rendering via [Three.js](https://threejs.org/) — männliche & weibliche GLB-Modelle |
| 💬 **Mehrsprachiger Chat** | Vollständige EN / DE / RU-Unterstützung in UI, LLM-Prompts und TTS-Stimmen |
| 📄 **Dokumentenwissen (RAG)** | PDFs hochladen — der Avatar beantwortet Fragen aus deinen eigenen Dokumenten via [ChromaDB](https://www.trychroma.com/) |
| 🎭 **Avatar-Ausdrücke** | Lippensynchronisation, autonomes Blinzeln, Idle-Animation, Emotions-Trigger per Emoji |
| 🔒 **100% Privat** | Alle KI-Dienste laufen in Docker-Containern — keine externen API-Aufrufe |

---

## 🏗️ Architektur

```
digital_avatar/
├── docker-compose.yml          # Orchestriert alle 4 Services
│
├── backend/                    # FastAPI — Haupt-API-Gateway
│   ├── api/
│   │   ├── chat.py             # Chat-Endpunkt (LLM + RAG + TTS)
│   │   ├── documents.py        # PDF-Upload & Verarbeitung
│   │   └── transcribe.py       # Whisper-Proxy-Endpunkt
│   ├── services/
│   │   ├── llm.py              # Ollama LLM-Integration
│   │   ├── tts.py              # TTS-Service-Client
│   │   └── rag.py              # RAG: ChromaDB-Vektorsuche
│   └── core/
│       ├── config.py           # Alle Umgebungseinstellungen
│       └── database.py         # SQLite-Chatverlauf
│
├── tts-server/                 # Flask — Silero TTS-Dienst (Port 5002)
│   └── server.py               # Mehrsprachige Sprachsynthese
│
├── whisper-server/             # Flask — faster-whisper STT-Dienst (Port 5003)
│   └── server.py               # Lokale Spracherkennung
│
└── frontend/                   # Vanilla JS — Modulare Web-App (Port 8000)
    ├── index.html
    └── static/
        ├── main.js             # App-Einstiegspunkt & Lebenszyklus
        ├── components/
        │   ├── Chat/           # Chat-UI & Sendelogik
        │   └── UiControls/     # Alle Button/Dropdown-Logik
        └── modules/
            ├── avatar/         # AvatarController, AvatarRenderer
            ├── audio/          # AudioManager (Web Audio API)
            ├── scene/          # Three.js SceneManager, SceneLoader
            └── core/           # State.js, I18n.js
```

---

## 🐳 Service-Übersicht

| Service | Port | Technologie | Zweck |
|---|---|---|---|
| `avatar-server` | 8000 | FastAPI + Python | Haupt-Backend, liefert Frontend aus |
| `tts-server` | 5002 | Flask + Silero | Text-zu-Sprache-Synthese |
| `whisper-server` | 5003 | Flask + faster-whisper | Sprache-zu-Text-Erkennung |
| `ollama` | 11434 | Ollama | Lokale LLM-Inferenz |

---

## 🚀 Schnellstart

### Voraussetzungen

- **Docker Desktop** (mit Docker Compose v2+)
- **~6 GB RAM** verfügbar für alle Services
- **~3 GB Festplattenspeicher** für Modelle und Container
- Moderner Browser mit WebGL-Unterstützung (Chrome, Firefox, Edge)

### 1. Repository klonen

```bash
git clone <deine-repo-url>
cd digital_avatar
```

### 2. LLM-Modell herunterladen (nur beim ersten Mal)

```bash
# Ollama-Container zuerst starten
docker compose up ollama -d

# Standard-Sprachmodell herunterladen
docker exec -it digital_avatar-ollama-1 ollama pull phi3

# Embedding-Modell für RAG herunterladen (Dokumentensuche)
docker exec -it digital_avatar-ollama-1 ollama pull nomic-embed-text
```

### 3. Alle Services bauen und starten

```bash
docker compose up --build
```

> ⏳ **Der erste Start dauert 5–10 Minuten** — Docker baut Images und Whisper lädt sein Modell herunter (~150MB).

### 4. Im Browser öffnen

```
http://localhost:8000
```

---

## 🎮 Voxentia verwenden

### Sprachauswahl
Auf dem Startbildschirm **EN**, **DE** oder **RU** auswählen, bevor du auf Start klickst. Dies setzt die Sprache für die UI, den LLM-System-Prompt und die TTS-Stimme.

### Steuerleiste

| Schaltfläche | Aktion |
|---|---|
| 🏠 **Startseite** | Zurück zum Startbildschirm für Sprachwechsel |
| 🎙️ **Sprechen** | Klicken zum Aufnehmen → erneut klicken zum Stoppen & Transkribieren |
| 🔊 **Ton testen** | Audio-Ausgabe überprüfen |
| 📹 **Videoanruf** | Videoanruf-Modus umschalten |
| 📷 **Kamera** | Webcam aktivieren |
| 📄 **Hochladen** | PDF-Dokument hochladen, damit der Avatar daraus lernt |
| Stimmen-Dropdown | Aus 4 Stimmen wählen (Baya, Kseniya, Eugene, Aidar) |
| Emoji-Dropdown | Gesichtsausdrücke manuell auslösen |

### Spracheingabe (Whisper)
1. **🎙️ Sprechen** klicken — Mikrofon wird aktiviert
2. Nachricht klar sprechen
3. **🎙️ Sprechen** erneut klicken — Audio wird an lokales Whisper gesendet
4. Transkription erscheint im Chat → Avatar antwortet

### Dokument-Upload (RAG)
1. **📄 Hochladen** klicken und eine PDF-Datei auswählen
2. Auf **✅ OK**-Bestätigung warten
3. Den Avatar Fragen zum Dokumentinhalt stellen
4. Der Avatar ruft relevante Passagen ab und antwortet darauf basierend

---

## ⚙️ Konfiguration

### Umgebungsvariablen

Eine `.env`-Datei erstellen (von `.env.example` kopieren):

```env
# LLM-Einstellungen
DEFAULT_MODEL=phi3
OLLAMA_TIMEOUT=120

# Sprache
DEFAULT_LANGUAGE=de

# Service-URLs (internes Docker-Netzwerk)
OLLAMA_URL=http://ollama:11434
TTS_URL=http://tts-server:5002
WHISPER_URL=http://whisper-server:5003
```

### Whisper-Modellgröße

`docker-compose.yml` bearbeiten, um das Whisper-Modell zu ändern (Geschwindigkeit vs. Genauigkeit):

```yaml
whisper-server:
  environment:
    - WHISPER_MODEL=base   # Optionen: tiny, base, small, medium, large-v3
```

| Modell | Größe | Geschwindigkeit | Genauigkeit |
|---|---|---|---|
| `tiny` | ~75 MB | Schnellste | Gut |
| `base` | ~145 MB | Schnell | Besser ✅ Standard |
| `small` | ~460 MB | Mittel | Sehr gut |
| `medium` | ~1,5 GB | Langsam | Exzellent |

### Verfügbare TTS-Stimmen

| Stimmen-ID | Sprache | Geschlecht | Deutsche Silero-Stimme |
|---|---|---|---|
| `baya` | RU/EN/DE | Weiblich | `eva_k` |
| `kseniya` | RU/EN/DE | Weiblich | `hokuspokus` |
| `eugene` | RU/EN/DE | Männlich | `bernd_ungerer` |
| `aidar` | RU/EN/DE | Männlich | `friedrich` |

---

## 🛠️ Entwicklung

### Frontend-Modulsystem

Alle Frontend-Module verwenden native ES-Module (kein Bundler erforderlich):

```javascript
// State-Management — reaktiver Store
import { appState } from './modules/core/State.js';
appState.update('language', 'de');
appState.subscribe('language', (val) => console.log('Sprache geändert:', val));

// i18n
import { i18n } from './modules/core/I18n.js';
i18n.setLanguage('de');
i18n.t('send_btn'); // → 'Senden'
```

### Neue Sprache hinzufügen

1. Übersetzungen zu `frontend/static/modules/core/I18n.js` hinzufügen
2. Stimmen zu `frontend/static/modules/core/State.js` hinzufügen
3. `lang-btn` in `frontend/index.html` hinzufügen
4. System-Prompt in `backend/core/config.py` hinzufügen
5. Sprachcode zu `whisper-server/server.py` → `LANG_MAP` hinzufügen

### Nach Code-Änderungen neu bauen

```bash
# Nur Backend neu bauen
docker compose up -d --build avatar-server

# Nur TTS-Server neu bauen
docker compose up -d --build tts-server

# Whisper-Server neu bauen
docker compose up -d --build whisper-server

# Vollständiger Neuaufbau
docker compose up --build
```

### Browser-Cache leeren

Nach Frontend-Änderungen immer Hard-Reload:
- **Windows/Linux**: `Strg + Umschalt + R`
- **macOS**: `Cmd + Umschalt + R`

---

## 🔍 Diagnose & Fehlerbehebung

### Service-Logs anzeigen

```bash
docker logs digital_avatar-avatar-server-1
docker logs digital_avatar-tts-server-1
docker logs digital_avatar-whisper-server-1
docker logs digital_avatar-ollama-1
```

### Häufige Probleme

| Problem | Ursache | Lösung |
|---|---|---|
| Kein Audio | Browser-Audio blockiert | Zuerst **🔊 Ton testen** klicken |
| Avatar in T-Pose | Keine Idle-Animation gefunden | Konsole prüfen — Animationen müssen in `assets/idle/` sein |
| TTS stumm bei EN/DE | Alter Container gecacht | `docker compose up -d --build tts-server` |
| Upload gibt 405 | Backend nicht neu gebaut | `docker compose up -d --build avatar-server` |
| Mikrofon zeigt ⏳ | Whisper lädt noch | `docker logs digital_avatar-whisper-server-1` prüfen |
| LLM antwortet in falscher Sprache | Alter Sitzungskontext | **🏠 Startseite** klicken, um Sitzung zurückzusetzen |

### Browser-Konsolen-Logs

DevTools öffnen (`F12`) → Konsole:
- `🚀 VOXENTIA AI SYSTEM v3.0 LOADED` — App initialisiert
- `[State Update]` — Reaktive Statusänderungen
- `📂 Loading N variations...` — Avatar-Animationsladung
- `🎙️ Transcribed [de]:` — Whisper-Ausgabe
- `🔊 [TTS] GENERATING AUDIO` — TTS-Verarbeitung

---

## 🗺️ Roadmap

- [ ] **Streaming-Antworten** — Wort-für-Wort LLM-Ausgabe für nahezu sofortige Sprachausgabe
- [ ] **Erweitertes Lip-Sync** — Visem-basierte Mundformen aus der Audiowellenform
- [ ] **Emotionen vom LLM** — Automatische Gesten durch `[lächeln]`-Tags in Antworten
- [ ] **Vision (Webcam)** — Multimodales Modell sieht Webcam-Eingabe
- [ ] **Stimmklonen** — Eigene TTS-Stimme via XTTS oder Coqui

---

## 📄 Lizenz

MIT-Lizenz — frei zu verwenden, zu modifizieren und zu verteilen.

---

## 🤝 Mitwirken

1. Repository forken
2. Feature-Branch erstellen: `git checkout -b feature/mein-feature`
3. Änderungen committen: `git commit -m 'Feature hinzufügen'`
4. Branch pushen: `git push origin feature/mein-feature`
5. Pull Request öffnen
