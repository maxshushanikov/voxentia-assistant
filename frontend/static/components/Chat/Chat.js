import { appState } from '../../modules/core/State.js';
import { i18n } from '../../modules/core/I18n.js';

export class Chat {
    constructor() {
        this.historyElement = null;
        this.inputElement = null;
        this.sendButton = null;
    }

    init() {
        this.historyElement = document.getElementById('history');
        this.inputElement = document.getElementById('textInput');
        this.sendButton = document.getElementById('sendBtn');
        
        this.setupEventListeners();
        
        // Subscribe to state changes for re-rendering
        appState.subscribe(() => this.renderMessages());
    }

    setupEventListeners() {
        if (!this.sendButton) return;

        this.sendButton.addEventListener('click', () => this.handleSend());
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });
    }

    async handleSend() {
        const text = this.inputElement.value.trim();
        if (!text || appState.chat.isSending) return;

        // Auto-resume audio on interaction via window.app.resumeAudio if needed
        if (window.app && window.app.resumeAudio) await window.app.resumeAudio();

        this.addMessage('user', text);
        this.inputElement.value = '';
        appState.update('chat.isSending', true);

        try {
            const startTime = Date.now();
            const response = await this.sendToBackend(text);
            appState.update('chat.lastResponseTime', Date.now() - startTime);

            this.addMessage('assistant', response.text);
            
            if (response.audio_url && window.app) {
                // Route through the app's playAudio which has the timeout and context
                // Thinking indicator stays visible while audio is playing
                await window.app.playAudio(response.audio_url);
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.showError(i18n.t('error_chat_failed'));
        } finally {
            appState.update('chat.isSending', false);
        }
    }

    async sendToBackend(text) {
        const speaker = document.getElementById('speakerSelect')?.value || 'baya';
        console.log(`🔘 Sending message with speaker: ${speaker} and lang: ${appState.language}`);
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: appState.session.sessionId,
                message: text,
                model: 'phi3', 
                speaker: speaker,
                language: appState.language
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    addMessage(role, content) {
        const messages = [...appState.chat.messages, {
            role,
            content,
            timestamp: Date.now()
        }];
        appState.update('chat.messages', messages);
    }

    renderMessages() {
        if (!this.historyElement) return;
        
        const messages = appState.chat.messages;
        this.historyElement.innerHTML = '';
        
        messages.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${msg.role}`;
            messageEl.textContent = msg.content;
            this.historyElement.appendChild(messageEl);
        });

        // Add thinking indicator if sending
        if (appState.chat.isSending) {
            const loadingEl = document.createElement('div');
            loadingEl.className = 'message assistant thinking';
            loadingEl.textContent = i18n.t('thinking');
            this.historyElement.appendChild(loadingEl);
        }
        
        this.historyElement.scrollTop = this.historyElement.scrollHeight;
    }

    showError(message) {
        if (window.app && window.app.showError) {
            window.app.showError(message);
        } else {
            console.error(message);
        }
    }
}

export function setupChat() {
    const chat = new Chat();
    chat.init();
    return chat;
}