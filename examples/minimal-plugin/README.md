# Minimal Voxentia Plugin Example

Dieses Verzeichnis enthält ein minimales Beispiel für ein Voxentia Plugin.

## Struktur
- `src/voxentia_minimal/plugin.py`: Die Haupt-Logik des Plugins.
- `pyproject.toml`: Paket-Definition.

## Wie man es benutzt
1. Kopiere den Ordner `voxentia_minimal` in dein `plugins/` Verzeichnis.
2. Registriere es in `backend/src/voxentia_app/main.py` oder nutze die `discover_plugins` Funktion der Registry.
3. Starte die App neu.

Das Plugin wird nun in der Konsole "Minimal Plugin geladen!" ausgeben.
