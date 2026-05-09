/**
 * Zentraler API-Client für die Kommunikation mit dem Voxentia-Backend.
 */
export const api = {
    baseUrl: window.location.origin,

    async chat(message, sessionId) {
        const response = await fetch(`${this.baseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, session_id: sessionId })
        });
        if (!response.ok) throw new Error('Chat API Fehler');
        return await response.json();
    },

    async getHistory(sessionId) {
        const response = await fetch(`${this.baseUrl}/api/chat/history?session_id=${sessionId}`);
        return await response.json();
    },

    async clearHistory(sessionId) {
        return await fetch(`${this.baseUrl}/api/chat/clear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
        });
    }
};
