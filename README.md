# 🌌 Voxentia: Your Modular AI Assistant

Voxentia ist eine skalierbare, lokale AI-Plattform mit Fokus auf Modularität, Datenschutz und Premium-Nutzererfahrung.

## 🚀 Key Features

- **Plugin-Host-Architektur**: Erweitere Voxentia mit eigenen Modulen (Jobs, Kalender, Tutor etc.).
- **Smart Orchestrator**: LLM-basierte Intent-Erkennung via Ollama (kein Keyword-Matching!).
- **Multi-Modal UI**: 3D-Avatar Integration mit synchronisierter Sprachausgabe und dynamischen Plugin-Panels.
- **Enterprise-Grade Core**: Strukturiertes Logging, asynchrone Fehlerbehandlung und Pydantic-basierte Konfiguration.
- **Privacy First**: Läuft komplett lokal auf deiner Hardware.

## 📂 Projektstruktur

```text
voxentia-assistant/
├── core/                   # Der KI-Kern (Framework)
│   ├── src/voxentia/       # Orchestrator, Plugin-Host, Utils
│   └── pyproject.toml      # Core-Abhängigkeiten
├── plugins/                # Funktionale Erweiterungen
│   ├── core_assistant/     # Wetter & Suche
│   ├── job_assistant/      # Karriere-Tools
│   └── calendar/           # Terminverwaltung
├── backend/                # FastAPI Webserver & Services
├── frontend/               # Vanilla JS SPA mit Three.js
├── docs/                   # Technische Dokumentation (MkDocs)
├── deployment/             # Docker & Cloud Konfiguration
└── tests/                  # Unit- & Integrations-Tests
```

## 🛠️ Schnellstart

### 1. Installation
```bash
make install
```

### 2. Konfiguration
Bearbeite `backend/src/voxentia_app/config/plugin_config.json`, um Plugins zu aktivieren oder zu deaktivieren.

### 3. Starten
```bash
make docker-up
```

## 📖 Dokumentation
Besuche die [Dokumentations-Übersicht](docs/architecture/overview.md) für detaillierte Informationen zur Architektur und Plugin-Entwicklung.

## 🤝 Contributing
Wir freuen uns über Beiträge! Schau dir den [Plugin-Entwickler-Guide](docs/plugins/developing.md) an, um direkt loszulegen.

---
*Voxentia — Intelligence localized.*