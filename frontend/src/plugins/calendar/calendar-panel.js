/**
 * UI-Komponente für das Kalender-Plugin.
 */
export const CalendarUI = {
    metadata: {
        name: "calendar",
        display_name: "Kalender",
        handled_intents: ["get_events", "add_event"]
    },

    render(data, container) {
        if (!data) return;

        // Falls wir eine Liste von Events haben
        if (data.events) {
            container.innerHTML = `
                <div class="calendar-header-info">Termine für heute:</div>
                <div class="event-list">
                    ${data.events.map(event => `
                        <div class="event-card">
                            <div class="event-time">
                                ${new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <div class="event-info">
                                <div class="event-title">${event.title}</div>
                                <div class="event-location">📍 ${event.location || 'Kein Ort'}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } 
        // Falls ein neues Event hinzugefügt wurde
        else if (data.new_event) {
            container.innerHTML = `
                <div class="success-message">✅ Termin erfolgreich hinzugefügt!</div>
                <div class="event-card highlight">
                    <div class="event-title">${data.new_event.title}</div>
                    <div class="event-time">${new Date(data.new_event.start_time).toLocaleString()}</div>
                </div>
            `;
        }

        // Öffne das Plugin-Panel
        document.getElementById('plugin-container').classList.remove('hidden');
    }
};
