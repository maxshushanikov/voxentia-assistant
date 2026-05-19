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

    async handleSend(textOverride = null) {
        const text = textOverride || this.inputElement.value.trim();
        if (!text || appState.chat.isSending) return;

        // Auto-resume audio on interaction
        if (window.app && window.app.resumeAudio) await window.app.resumeAudio();

        this.addMessage('user', text);
        this.inputElement.value = '';
        appState.update('chat.isSending', true);

        try {
            const speaker = document.getElementById('speakerSelect')?.value || 'baya';
            const startTime = Date.now();
            
            // 1. Start streaming text
            const assistantMsg = this.addMessage('assistant', '');
            const fullText = await this.readStream(text, assistantMsg);
            
            appState.update('chat.lastResponseTime', Date.now() - startTime);

            // 2. Once text is finished, generate audio
            if (fullText) {
                const ttsResponse = await fetch('/api/tts/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: fullText,
                        speaker: speaker,
                        language: appState.language
                    })
                });
                
                if (ttsResponse.ok) {
                    const { audio_url } = await ttsResponse.json();
                    if (audio_url && window.app) {
                        await window.app.playAudio(audio_url);
                    }
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.showError(i18n.t('error_chat_failed'));
        } finally {
            appState.update('chat.isSending', false);
        }
    }

    async readStream(text, messageObj) {
        const speaker = document.getElementById('speakerSelect')?.value || 'baya';
        
        // Capture image if webcam is active
        let image_data = null;
        if (window.app && window.app.captureWebcamFrame) {
            image_data = window.app.captureWebcamFrame();
        }

        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: appState.session.sessionId,
                message: text,
                model: 'phi3',
                speaker: speaker,
                language: appState.language,
                image: image_data // Send base64 image if available
            })
        });

        if (!response.ok) throw new Error('Stream error');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        this.lastTriggeredEmotion = null;
        let lastUpdateTime = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            
            // Check for emotion tags like [happy] anywhere in text
            const matches = fullText.match(/\[(.*?)\]/g);
            if (matches) {
                const lastMatch = matches[matches.length - 1];
                const emotion = lastMatch.replace(/[\[\]]/g, '');
                if (emotion !== this.lastTriggeredEmotion && window.app && window.app.avatar) {
                    window.app.avatar.setEmotion(emotion);
                    this.lastTriggeredEmotion = emotion;
                }
            }

            // Update message in state (throttled)
            const now = Date.now();
            if (now - lastUpdateTime > 100) {
                const displayOutput = fullText.replace(/\[.*?\]\s*/g, '');
                messageObj.content = displayOutput;
                appState.update('chat.messages', [...appState.chat.messages]);
                lastUpdateTime = now;
            }
        }

        // Final update
        const displayOutput = fullText.replace(/\[.*?\]\s*/g, '');
        messageObj.content = displayOutput;
        appState.update('chat.messages', [...appState.chat.messages]);

        return fullText;
    }

    async clearChat() {
        try {
            await fetch('/api/chat/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: appState.session.sessionId })
            });
            appState.update('chat.messages', []);
        } catch (error) {
            console.error('Clear chat error:', error);
        }
    }

    addMessage(role, content) {
        const newMessage = {
            role,
            content,
            timestamp: Date.now()
        };
        const messages = [...appState.chat.messages, newMessage];
        appState.update('chat.messages', messages);
        return newMessage;
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