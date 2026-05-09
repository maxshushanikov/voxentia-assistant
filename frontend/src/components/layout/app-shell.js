/**
 * Verwaltet das Haupt-Layout und die Sichtbarkeit von Panels.
 */
export const AppLayout = {
    elements: {
        pluginContainer: document.getElementById('plugin-container'),
        mainLayout: document.getElementById('mainLayout'),
        startOverlay: document.getElementById('start-overlay')
    },

    showMain() {
        this.elements.startOverlay.classList.add('hidden');
        this.elements.mainLayout.classList.remove('hidden');
    },

    togglePluginPanel(show = true) {
        if (show) {
            this.elements.pluginContainer.classList.remove('hidden');
        } else {
            this.elements.pluginContainer.classList.add('hidden');
        }
    },

    setPluginTitle(title) {
        const titleEl = this.elements.pluginContainer.querySelector('.plugin-title');
        if (titleEl) titleEl.textContent = title;
    }
};
