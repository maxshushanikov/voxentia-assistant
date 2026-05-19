# Write a Voxentia plugin in 10 minutes

## 1. Scaffold

```
plugins/my_plugin/
  src/voxentia_my_plugin/
    plugin.py
```

## 2. Implement `VoxentiaPlugin`

```python
from typing import Any, Dict
from voxentia.plugins.base import PluginMetadata, PluginResponse, VoxentiaPlugin

class MyPlugin(VoxentiaPlugin):
    supported_intents = ["my_action"]  # self-registering routing

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="my_plugin",
            display_name="My Plugin",
            version="1.0.0",
            description="Does one thing well",
            author="You",
        )

    async def initialize(self) -> None:
        await self.on_startup()  # optional alias

    async def handle_intent(self, intent: str, entities: Dict[str, Any]) -> PluginResponse:
        if intent == "my_action":
            return PluginResponse(text="Done!", data={"ok": True})
        return PluginResponse(text="Unknown intent")

    async def shutdown(self) -> None:
        pass
```

## 3. Enable in config

`backend/app/core/config/plugin_config.json`:

```json
{
  "plugins": {
    "my_plugin": { "enabled": true }
  }
}
```

## 4. Lifecycle hooks

| Hook | When |
|------|------|
| `on_startup` / `initialize` | After discovery |
| `pre_llm` | Before LLM fallback — return extra context |
| `on_message` / `handle_intent` | Intent matched |
| `on_shutdown` / `shutdown` | App shutdown |

## 5. Test locally

```bash
make install
AUTH_ENABLED=false pytest tests/plugins/ -v
```

The orchestrator routes by `supported_intents` — no changes to `router.py` required.
