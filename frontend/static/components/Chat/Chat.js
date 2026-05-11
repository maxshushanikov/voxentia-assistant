import { appState } from '../../modules/core/State.js';
import { i18n } from '../../modules/core/I18n.js';
import { pluginManager } from '../../../src/plugins/loader.js';
import { JobAssistantUI } from '../../../src/plugins/job_assistant/job-panel.js';
import { CalendarUI } from '../../../src/plugins/calendar/calendar-panel.js';

// Vorab-Registrierung der UI-Plugins
pluginManager.registerPlugin(JobAssistantUI.metadata, JobAssistantUI);
pluginManager.registerPlugin(CalendarUI.metadata, CalendarUI);

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
        
        this.addGreeting();

        // Configure marked.js
        if (window.marked) {
            window.marked.setOptions({ breaks: true });
        }
    }

    addGreeting() {
        const greetings = {
            'de': 'Hallo! Wie kann ich dir heute helfen?',
            'en': 'Hello! How can I help you today?',
            'ru': 'Привет! Чем я могу вам помочь сегодня?'
        };
        const text = greetings[appState.language] || greetings['en'];
        this.addMessage('assistant', text);
    }

    setupQuickActions() {
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const intent = btn.getAttribute('data-intent');
                const label = btn.querySelector('.label').textContent;
                this.handleSend(label);
            });
        });
    }

    setupEventListeners() {
        if (!this.sendButton) return;
        this.sendButton.addEventListener('click', () => this.handleSend());
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });

        // Handle New Chat (Claude Style reset)
        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                this.clearChat();
                const mainContent = document.querySelector('.main-content');
                const chatView = document.getElementById('chat-view');
                if (mainContent) mainContent.classList.remove('chat-active');
                if (chatView) chatView.classList.remove('active');
            });
        }
    }

    async handleSend(textOverride = null) {
        const text = textOverride || this.inputElement.value.trim();
        if (!text || appState.chat.isSending) return;

        // Claude Transition: Show chat view, compact input
        const mainContent = document.querySelector('.main-content');
        const chatView = document.getElementById('chat-view');
        if (mainContent) mainContent.classList.add('chat-active');
        if (chatView) chatView.classList.add('active');

        // Auto-resume audio on interaction
        if (window.app && window.app.resumeAudio) await window.app.resumeAudio();

        this.addMessage('user', text);
        this.inputElement.value = '';
        appState.update('chat.isSending', true);

        try {
            const speaker = document.getElementById('speakerSelect')?.value || 'baya';
            const startTime = Date.now();
            
            // --- MODERN PLUGIN MODE ---
            const assistantMsg = this.addMessage('assistant', i18n.t('thinking') || 'Thinking...');
            
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    session_id: appState.session.sessionId
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                // Update text content
                assistantMsg.content = result.text;
                appState.update('chat.messages', [...appState.chat.messages]);
                
                // Render Plugin UI if data is present
                if (result.plugin_data) {
                    const pluginContent = document.getElementById('plugin-content');
                    const pluginTitle = document.querySelector('.plugin-title');
                    
                    if (result.intent === 'job_search') {
                        pluginTitle.textContent = "Gefundene Jobs";
                    }
                    
                    pluginManager.renderResponse(result.intent, result.plugin_data, pluginContent);
                }

                // Trigger TTS for the whole response (simplified for now)
                await this.triggerSentenceTTS(result.text.replace(/\[.*?\]/g, ''));
            } else {
                // Fallback to old streaming (optional)
                // await this.readStream(text, assistantMsg);
            }
            
            appState.update('chat.lastResponseTime', Date.now() - startTime);
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
                personality: appState.avatar.personality,
                image: image_data, // Send base64 image if available
                use_tools: appState.toolsEnabled
            })
        });

        if (!response.ok) throw new Error('Stream error');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let processedTextForTTS = '';
        this.lastTriggeredEmotion = null;
        let lastUpdateTime = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            
            // --- STREAMING TTS LOGIC ---
            // Find complete sentences that haven't been sent to TTS yet
            let newText = fullText.substring(processedTextForTTS.length);
            
            // Sentence detection: look for . ! or ? followed by space or end of string
            const sentenceMatch = newText.match(/.*?[.!?](\s+|$)/g);
            if (sentenceMatch) {
                for (const sentence of sentenceMatch) {
                    const cleanSentence = sentence.trim().replace(/\[.*?\]/g, ''); // Remove tags
                    if (cleanSentence.length > 2) {
                        console.log(`📡 Triggering TTS for sentence: ${cleanSentence}`);
                        // AWAIT here is crucial to keep sentences in order and avoid parallel audio starts
                        await this.triggerSentenceTTS(cleanSentence);
                    }
                    processedTextForTTS += sentence;
                }
            }
            // --- END STREAMING TTS ---

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

        // Process any remaining text that didn't end with a sentence marker
        let remainingText = fullText.substring(processedTextForTTS.length).trim().replace(/\[.*?\]/g, '');
        if (remainingText.length > 0) {
            await this.triggerSentenceTTS(remainingText);
        }

        return fullText;
    }

    async triggerSentenceTTS(text) {
        const speaker = document.getElementById('speakerSelect')?.value || 'baya';
        try {
            const ttsResponse = await fetch('/api/tts/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    speaker: speaker,
                    language: appState.language,
                    use_tools: appState.toolsEnabled
                })
            });
            
            if (ttsResponse.ok) {
                const { audio_url } = await ttsResponse.json();
                if (audio_url && window.app) {
                    // Note: window.app.playAudio now handles the queue internally
                    await window.app.playAudio(audio_url);
                }
            }
        } catch (error) {
            console.error('Streaming TTS error:', error);
        }
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
        const currentElements = this.historyElement.querySelectorAll('.message:not(.thinking)');
        
        messages.forEach((msg, index) => {
            let messageEl = currentElements[index];
            
            // Handle [think] tags by wrapping them in a subtle style
            let displayContent = msg.content.replace(/\[think\](.*?)(\[|$)/gi, (match, p1) => {
                return `<em class="thought-process">${p1}</em>`;
            });

            if (!messageEl) {
                // Create new message element
                messageEl = document.createElement('div');
                messageEl.className = `message ${msg.role}`;
                
                const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                let senderName = 'Voxentia';
                if (msg.role === 'user') {
                    senderName = appState.language === 'de' ? 'Du' : (appState.language === 'ru' ? 'Вы' : 'You');
                }

                const icon = msg.role === 'user' ? 'person' : 'smart_toy';
                
                // Parse markdown
                let renderedContent = displayContent;
                if (window.marked) {
                    renderedContent = window.marked.parse(displayContent);
                }

                messageEl.innerHTML = `
                    <div class="msg-meta">
                        <span class="sender">${senderName}</span>
                        <span class="time">${time}</span>
                    </div>
                    <div class="msg-bubble content markdown-body">
                        ${renderedContent}
                    </div>
                `;
                this.historyElement.appendChild(messageEl);
            } else {
                // Update existing message content ONLY if it changed
                const contentEl = messageEl.querySelector('.content');
                if (contentEl) {
                    let renderedContent = displayContent;
                    if (window.marked) {
                        renderedContent = window.marked.parse(displayContent);
                    }
                    if (contentEl.innerHTML !== renderedContent) {
                        contentEl.innerHTML = renderedContent;
                    }
                }
            }
        });

        // Remove any thinking indicator before adding it again at the end
        const oldThinking = this.historyElement.querySelector('.message.thinking');
        if (oldThinking) oldThinking.remove();

        // Add thinking indicator if sending
        if (appState.chat.isSending) {
            const loadingEl = document.createElement('div');
            loadingEl.className = 'message assistant thinking';
            loadingEl.innerHTML = `
                <div class="message-avatar">
                    <span class="material-symbols-outlined">smart_toy</span>
                </div>
                <div class="message-body">
                    <div class="message-meta"><span class="sender">Voxentia</span></div>
                    <div class="message-content-wrapper content">
                        <div class="typing-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                </div>
            `;
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