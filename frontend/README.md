# 🎨 Voxentia Frontend

The Voxentia frontend is a modern, modular web application built with vanilla JavaScript and Material Design 3 principles.

## 🚀 Technology Stack
- **Styling**: Vanilla CSS with **Material Design 3 (MD3)** components
- **3D Engine**: [Three.js](https://threejs.org/) for real-time avatar rendering
- **Iconography**: [Google Material Symbols](https://fonts.google.com/icons)
- **Audio**: Web Audio API for playback and microphone management
- **Architecture**: Modular ES6 Modules (No bundler needed)

## 📂 Directory Structure

```
frontend/
├── index.html              # Main entry point & MD3 layout
└── static/
    ├── main.js             # App Controller & I18n initialization
    ├── components/         # MD3 UI Components
    │   ├── Chat/           # Chat list & message handling
    │   └── UiControls/     # Selects, Buttons, and Sidebar logic
    ├── modules/            # Core business logic
    │   ├── avatar/         # Avatar animation & GLB management
    │   ├── audio/          # AudioManager & Microphone Reset logic
    │   ├── scene/          # Three.js lighting, cameras, and loaders
    │   └── core/           # State Management (appState) & I18n
    └── styles/             # Main CSS & MD3 tokens
```

## 🛠️ Key Systems

### 1. Material Design 3 UI
The layout uses a **Navigation Rail** for primary navigation and a **Top App Bar** for contextual settings. Buttons are styled as **Outlined FABs** or **Circular Icon Buttons**, following Google's latest design specifications.

### 2. Reactive State Management
The `State.js` module provides a lightweight, reactive store. Components can `subscribe` to changes (e.g., language switch, personality change) and update the UI automatically.

### 3. Internationalization (I18n)
All UI text is externalized in `I18n.js`. The `main.js` controller handles dynamic DOM translation while preserving icons and interactive elements.

### 4. Audio Recovery (Nuclear Reset)
To handle browser-level microphone locks, the `AudioManager` implements a "Nuclear Reset" strategy: it closes the AudioContext, waits for a hardware release, and attempts a fresh `getUserMedia` call automatically.

## 🖥️ Development

Since the app uses native ES modules, you can serve it with any simple static file server:

```bash
# Using Python
python -m http.server 8000
```

The frontend expects the backend API to be available at `http://localhost:8000/api`.
