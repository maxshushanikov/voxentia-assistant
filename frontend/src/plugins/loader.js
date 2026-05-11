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

    /**
     * Lädt eine Plugin-UI dynamisch (Lazy-Loading).
     */
    async loadPluginUI(name) {
        if (this.plugins.has(name)) return this.plugins.get(name);
        
        try {
            // Dynamischer Import (Code-Splitting)
            const module = await import(`./${name}/panel.js`);
            const pluginUI = module.default || module;
            this.registerPlugin(pluginUI.metadata, pluginUI);
            return pluginUI;
        } catch (error) {
            console.error(`Fehler beim Lazy-Loading von Plugin ${name}:`, error);
            return null;
        }
    }

    /**
     * Rendert eine Plugin-spezifische Antwort.
     */
    async renderResponse(intent, data, container) {
        // Suche passendes Plugin
        const plugin = Array.from(this.plugins.values()).find(p => p.metadata.handled_intents.includes(intent));
        
        if (plugin && plugin.render) {
            plugin.render(data, container);
        } else {
            container.innerHTML = `<p>${data.text || JSON.stringify(data)}</p>`;
        }
    }
}

export const pluginManager = new PluginManager();
