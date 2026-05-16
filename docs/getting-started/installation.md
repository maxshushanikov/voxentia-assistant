# Installation

Voxentia ist für den Betrieb in Docker optimiert, kann aber auch lokal installiert werden.

## Voraussetzungen
- **Docker & Docker Compose** (Empfohlen)
- **Ollama** (für das LLM)
- **Python 3.10+** (falls lokal installiert wird)

## Installation via Docker (Schnellstart)

1. Repository klonen:
   ```bash
   git clone https://github.com/maxshushanikov/voxentia-assistant.git
   cd voxentia-assistant
   ```

2. Umgebungsvariablen anpassen:
   Kopiere `.env.example` zu `.env` und trage deine URLs ein.

3. Container starten:
   ```bash
   docker compose up --build
   ```

4. Voxentia öffnen:
   Gehe in deinem Browser auf `http://localhost` (Nginx/Frontend) oder `http://localhost:8000` (nur Backend-API).

## Hardware-Anforderungen
Für eine flüssige Interaktion empfehlen wir:
- Mind. 16GB RAM
- Eine NVIDIA GPU (für schnellere LLM-Antworten via Ollama)
