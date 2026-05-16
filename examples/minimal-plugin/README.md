# Minimal Voxentia Plugin Example

This folder contains a minimal Voxentia plugin.

## Structure

- `src/voxentia_minimal/plugin.py` — plugin logic
- `pyproject.toml` — package definition (optional for local installs)

## How to enable it

1. Copy or symlink the plugin under `plugins/`.
2. Enable it in `backend/app/core/config/plugin_config.json`:

   ```json
   "minimal_example": {
     "enabled": true,
     "config": {}
   }
   ```

3. Restart the backend. The registry discovers plugins from the `plugins/` directory automatically.

The plugin logs `Minimal Plugin geladen!` on startup when enabled.
