# 🤖 Voxentia – KI-Digitalassistent

> **Ein vollständig lokales, datenschutzfreundliches KI-Avatar-System** mit Echtzeit-3D-Rendering, mehrsprachiger Sprachinteraktion, Spracherkennung und dokumentenbasiertem Wissenssystem. Keine Cloud-Dienste. Keine Daten verlassen deinen Computer.

**[🇬🇧 English Version](README.md) | [🇷🇺 Русская версия](README_RU.md)**

---

## ✨ Funktionen

| Funktion | Beschreibung |
|---|---|
| 🧠 **Lokales LLM** | Betrieben von [Ollama](https://ollama.com/) mit `phi3` — läuft 100% auf deiner Hardware |
| 🎨 **MD3 Interface** | Modernes **Material Design 3** UI mit Navigation Rail, Top App Bar und professioneller Ikonographie |
| 🎭 **Persona-System** | Dynamische Rollenwechsel: **Experten-Berater**, **Freundlicher Begleiter** und **Akademischer Tutor** |
| 🛠️ **Tool-Unterstützung** | Architektur für externe Funktionsaufrufe (z.B. Suche, Wetter), integriert in das LLM-Reasoning |
| 🎙️ **Lokale Spracherkennung** | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) — `base`-Modell, mehrsprachig |
| 🔊 **Lokale Sprachsynthese** | [Silero TTS](https://github.com/snakers4/silero-models) — Hochwertige EN / DE / RU Stimmen |
| 🧍 **3D-Avatar** | Echtzeit-Rendering via [Three.js](https://threejs.org/) mit Lip-Sync und manueller Mimik-Steuerung |
| 📄 **Dokumentenwissen** | PDF-Upload & RAG-Unterstützung via [ChromaDB](https://www.trychroma.com/) |
| 🔒 **100% Privat** | Alle KI-Dienste laufen in Docker-Containern — keine Daten verlassen deinen Computer |

---

## 🏗️ Architektur

```
digital_avatar/
├── backend/                    # FastAPI — API Gateway & Services
│   ├── api/                    # REST Endpunkte (Chat, Docs, Transcribe)
│   ├── services/
│   │   ├── llm.py              # Ollama Client + Tool-Use Loop Logik
│   │   ├── tools.py            # Registrierte Tools (Wetter, Suche, etc.)
│   │   ├── tts.py              # TTS Synthese Client
│   │   └── rag.py              # ChromaDB Vektorsuche
│   └── core/                   # Konfiguration, Datenbank, Persona-Prompts
│
├── frontend/                   # Vanilla JS — Modulare Web-App (MD3)
│   ├── index.html              # Modernes Rail-basiertes Layout
│   └── static/
│       ├── main.js             # I18n & App-Lebenszyklus Management
│       ├── components/         # Chat & UI Steuerungskomponenten
│       └── modules/            # Three.js (Avatar), WebAudio (Audio), State
│
├── tts-server/                 # Silero TTS Dienst (Lokaler Python Container)
└── whisper-server/             # faster-whisper STT Dienst (Lokaler Python Container)
```

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

### 2. Modelle herunterladen (nur beim ersten Mal)

```bash
# Ollama-Container starten
docker compose up ollama -d

# Standard-Sprachmodell und Embedding-Modell laden
docker exec -it digital_avatar-ollama-1 ollama pull phi3
docker exec -it digital_avatar-ollama-1 ollama pull nomic-embed-text
```

### 3. Alle Services starten

```bash
docker compose up --build
```

---

## 🎮 Voxentia verwenden

### Sprach- und Rollenauswahl
Über die neue **Top App Bar** kannst du jederzeit zwischen den Sprachen und den verschiedenen **Personas** (Experte, Begleiter, Tutor) wechseln. Dies beeinflusst sofort das Verhalten und die Tonalität des Avatars.

### Navigation Rail (Sidebar)

| Icon | Aktion |
|---|---|
| 🏠 | **Home**: Zurück zum Startbildschirm |
| 📄 | **Upload**: PDF-Dokumente für das RAG-Wissen hochladen |
| 📹 | **Videoanruf**: Videoanruf-Modus umschalten |
| 📷 | **Kamera**: Webcam für Vision-Features aktivieren |

### Hauptsteuerung

*   **🎙️ Mikrofon-Icon**: Klicken zum Sprechen, erneut klicken zum Senden.
*   **🔊 Lautsprecher-Icon**: Audiotest durchführen.
*   **🎭 Gesichts-Icon**: Mimik des Avatars manuell steuern.

---

## 🔍 Diagnose & Fehlerbehebung

### Häufige Probleme

| Problem | Ursache | Lösung |
|---|---|---|
| Kein Audio | Browser-Audio blockiert | Zuerst auf das **Lautsprecher-Icon** klicken |
| Mikrofon-Fehler | Hardware-Lock | Die App führt automatisch einen "Nuclear Reset" durch — warte 2 Sek. |
| Avatar in T-Pose | Animation fehlt | Prüfe `assets/idle/` auf gültige GLB-Dateien |
| LLM antwortet falsch | Alter Kontext | Klicke auf das **Haus-Icon**, um die Session zurückzusetzen |

---

## 🗺️ Roadmap

- [x] **Material Design 3 UI** — Navigation Rail, Outlined FABs und moderne Typografie
- [x] **Tool-Use Integration** — Die KI kann nun interne Python-Funktionen ausführen
- [x] **Streaming Antworten** — Wort-für-Wort Ausgabe für null Latenz-Gefühl
- [x] **Persona Engine** — Wechsel zwischen Experten-, Freundlich- und Tutor-Rollen
- [ ] **Emotionale Vision** — Stimmungserkennung via Webcam zur Anpassung der Reaktion
- [ ] **Erweitertes Lip-Sync** — Visem-basierte Mundformen aus der Audiowellenform
- [ ] **Langzeitgedächtnis** — Personalisiertes RAG für Nutzer-Kontext über Sessions hinweg

---

## 📄 Lizenz

MIT-Lizenz — frei zu verwenden, zu modifizieren und zu verteilen.
