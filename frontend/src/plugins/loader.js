/**
 * Verwaltet das dynamische Laden von UI-Komponenten für Plugins.
 */
class PluginManager {
    constructor() {
        this.plugins = new Map();
    }

    registerPlugin(metadata, component) {
        this.plugins.set(metadata.name, {
            metadata,
            component
        });
        console.log(`🔌 UI Plugin registriert: ${metadata.display_name}`);
    }

    getPluginUI(name) {
        const plugin = this.plugins.get(name);
        return plugin ? plugin.component : null;
    }

    /**
     * Rendert eine Plugin-spezifische Antwort, falls vorhanden.
     */
    renderResponse(intent, data, container) {
        const plugin = Array.from(this.plugins.values()).find(p => p.metadata.handled_intents.includes(intent));
        if (plugin && plugin.component.render) {
            plugin.component.render(data, container);
        } else {
            // Fallback: Standard-Text-Rendering
            container.innerHTML = `<p>${data.text || data}</p>`;
        }
    }
}

export const pluginManager = new PluginManager();
