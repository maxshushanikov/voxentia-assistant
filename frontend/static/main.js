import { initScene } from './modules/scene/index.js';
import { AudioManager } from './modules/audio/AudioManager.js';
import { AvatarController } from './modules/avatar/AvatarController.js';
import { AvatarRenderer } from './modules/avatar/AvatarRenderer.js';
import { setupUiControls } from './components/UiControls/UiControls.js';
import { setupChat } from './components/Chat/Chat.js';
import { appState } from './modules/core/State.js';
import { i18n } from './modules/core/I18n.js';

console.log("🚀 VOXENTIA AI DIGITAL ASSISTANT v3.1 LOADED");

class App {
    /**
     * The main Application controller for the Voxentia Frontend.
     * Manages the lifecycle of 3D rendering, audio, chat, and UI state.
     */
    constructor() {
        this.sceneManager = null; // Three.js scene management
        this.avatar = null;       // Avatar controller (GLB loading & animation)
        this.avatarRenderer = null; // Linker between audio and avatar animation
        this.audio = null;        // Web Audio API & Mic management
        this.chat = null;         // Chat UI component
        this.ui = null;           // UI controls (buttons, dropdowns)
        this.isInitialized = false;
    }

    async init() {
        /**
         * Bootstrap the application.
         * Sequence: Scene -> Avatar -> Audio -> Components -> Renderer
         */
        if (this.isInitialized) {
            console.warn('⚠️ App already initialized, skipping.');
            return;
        }
        this.isInitialized = true;

        this.updateSystemStatus('loading', 'Initializing...');
        try {
            // 1. Initialize Scene
            this.sceneManager = await initScene();
            this.sceneManager.animate();

            // 2. Load Avatar
            this.avatar = new AvatarController(this.sceneManager);
            await this.avatar.loadAvatar(appState.avatar.currentModel);

            // 3. Initialize Audio Service
            this.audio = new AudioManager();
            await this.audio.init();

            // 4. Setup Components
            this.ui = setupUiControls(this);
            this.chat = setupChat();

            // Add listener for input-bar mic button (ChatGPT-5 style)
            const inputMicBtn = document.getElementById('inputMicBtn');
            if (inputMicBtn) {
                inputMicBtn.addEventListener('click', () => this.handleMicToggle());
            }

            // Populate initial voices
            if (this.ui && this.ui.updateSpeakerDropdown) {
                this.ui.updateSpeakerDropdown(appState.language);
            }

            // 5. Setup Renderer (Connects everything)
            this.avatarRenderer = new AvatarRenderer(this.sceneManager, this.avatar, this.audio);
            this.avatarRenderer.start();

            appState.update('session.status', 'connected');
            console.log('App initialized successfully');

            // Apply initial translations
            this.updateUiTranslations();

            // 6. Load History
            await this.loadChatHistory();

            this.updateSystemStatus('ready', 'Ready');

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.updateSystemStatus('error', 'Init Failed');
            this.showError(i18n.t('error_initialization'));
        }
    }

    updateSystemStatus(state, label) {
        // 1. Update Top-Bar Status
        const badge = document.getElementById('systemStatus');
        if (badge) {
            const labelEl = badge.querySelector('.label');
            badge.className = `status-badge ${state}`;
            if (labelEl) labelEl.textContent = label;
        }

        // 2. Update Sidebar Status Indicator (New location)
        const sidebarStatus = document.getElementById('statusIndicator');
        if (sidebarStatus) {
            const sidebarLabel = sidebarStatus.querySelector('.label');
            sidebarStatus.className = `status-badge ${state}`;
            if (sidebarLabel) sidebarLabel.textContent = label;
        }
    }

    async loadChatHistory() {
        /**
         * Fetches previous chat messages for the current session from the backend.
         */
        try {
            const sessionId = appState.session.sessionId || 'default';
            const response = await fetch(`/api/chat/history?session_id=${sessionId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.history && data.history.length > 0) {
                    console.log(`📜 Loaded ${data.history.length} historical messages.`);
                    appState.update('chat.messages', data.history);
                }
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }

    async resumeAudio() {
        if (this.audio) await this.audio.resume();
    }

    async playAudio(url) {
        try {
            console.log(`🔊 Playing Voice: ${url}`);
            appState.update('avatar.isSpeaking', true);
            if (this.avatar) this.avatar.setSpeaking(true);

            // 300s Timeout for safety (support massive files)
            const audioPromise = this.audio.playAudio(url);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Audio playback timeout')), 300000)
            );

            await Promise.race([audioPromise, timeoutPromise]);
        } catch (error) {
            console.error('Audio playback error:', error);
        } finally {
            appState.update('avatar.isSpeaking', false);
            if (this.avatar) this.avatar.setSpeaking(false);
        }
    }

    async handleModelChange(modelPath) {
        if (!modelPath) return;
        try {
            this.showError(i18n.t('error_loading_model'));
            if (this.avatar) this.avatar.dispose();
            await this.avatar.loadAvatar(modelPath);
            appState.update('avatar.currentModel', modelPath);
            this.showError(i18n.t('error_model_loaded'));
        } catch (error) {
            console.error('Model change error:', error);
            this.showError(i18n.t('error_model_change'));
        }
    }

    handleMicToggle() {
        if (this.audio && !this.audio.isRecording) {
            this.startVoiceRecognition();
        } else {
            this.stopVoiceRecognition();
        }
    }

    async startVoiceRecognition() {
        /**
         * Activates the microphone and visualizes the recording state.
         */
        try {
            if (!this.audio) return;

            await this.audio.startRecording();
            const micBtn = document.getElementById('micBtn');
            const inputMicBtn = document.getElementById('inputMicBtn');
            if (micBtn) micBtn.classList.add('active');
            if (inputMicBtn) inputMicBtn.classList.add('active');

            const statusEl = document.getElementById('recordingStatus');
            if (statusEl) statusEl.classList.add('visible');

            console.log('🎤 Recording started...');
        } catch (err) {
            console.error('🎤 App: Microphone error:', err);
            if (err.name === 'NotReadableError') {
                this.showError(i18n.t('error_mic_busy'));
            } else {
                this.showError(i18n.t('error_mic_failed'));
            }
        }
    }

    async stopVoiceRecognition() {
        if (!this.audio) return;

        try {
            const blob = await this.audio.stopRecording();
            const micBtn = document.getElementById('micBtn');
            const inputMicBtn = document.getElementById('inputMicBtn');
            if (micBtn) micBtn.classList.remove('active');
            if (inputMicBtn) inputMicBtn.classList.remove('active');

            const statusEl = document.getElementById('recordingStatus');
            if (statusEl) statusEl.classList.remove('visible');

            if (blob) {
                console.log('🎤 Recording stopped, processing...');
                await this._sendToWhisper(blob, 'audio/wav');
            }
        } catch (err) {
            console.error('Stop recording error:', err);
        }
    }

    async _sendToWhisper(audioBlob, mimeType) {
        /**
         * Sends recorded audio to the whisper-server via the backend transcribe endpoint.
         */
        const micBtn = document.getElementById('micBtn');
        const inputMicBtn = document.getElementById('inputMicBtn');

        // Disable and show spinner for both buttons
        if (micBtn) {
            micBtn.disabled = true;
            micBtn.classList.add('processing');
            const iconEl = micBtn.querySelector('.material-symbols-outlined');
            if (iconEl) iconEl.textContent = 'hourglass_top';
        }
        if (inputMicBtn) {
            inputMicBtn.disabled = true;
            inputMicBtn.classList.add('processing');
            const inputIconEl = inputMicBtn.querySelector('.material-symbols-outlined');
            if (inputIconEl) inputIconEl.textContent = 'hourglass_top';
        }

        try {
            const formData = new FormData();
            const ext = mimeType.includes('webm') ? 'webm' : 'wav';
            formData.append('audio', audioBlob, `recording.${ext}`);
            formData.append('language', appState.language);
            formData.append('personality', appState.avatar.personality);

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Whisper error: ${response.status}`);

            const result = await response.json();
            const text = result.text?.trim();

            if (text && this.chat) {
                this.chat.handleSend(text);
            } else {
                this.showError(i18n.t('error_speech_unsupported') || 'No speech detected.');
            }
        } catch (err) {
            console.error('Whisper transcription failed:', err);
            this.showError('Voice recognition failed. Please try again.');
        } finally {
            if (micBtn) {
                const iconEl = micBtn.querySelector('.material-symbols-outlined');
                if (iconEl) iconEl.textContent = 'mic';
                micBtn.disabled = false;
                micBtn.classList.remove('processing');
            }
            if (inputMicBtn) {
                const inputIconEl = inputMicBtn.querySelector('.material-symbols-outlined');
                if (inputIconEl) inputIconEl.textContent = 'mic';
                inputMicBtn.disabled = false;
                inputMicBtn.classList.remove('processing');
            }
        }
    }

    handleCallToggle() {
        appState.update('connection.isCallActive', !appState.connection.isCallActive);
        document.getElementById('callBtn').classList.toggle('active', appState.connection.isCallActive);
    }

    handleLanguageChange(lang) {
        appState.update('language', lang);
        this.updateUiTranslations();
        // Clear chat on language switch to avoid mixed-language history
        if (this.chat) this.chat.clearChat();
        appState.update('session.sessionId', 'session_' + Math.random().toString(36).substr(2, 9));
        console.log(`🌐 Language changed to: ${lang}, session reset.`);
    }

    async handleWebcamToggle() {
        const webcamBtn = document.getElementById('webcamBtn');
        const webcamPreview = document.getElementById('webcam-preview');
        const webcamContainer = document.getElementById('webcam-container');

        if (!appState.connection.isWebcamActive) {
            try {
                this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
                webcamPreview.srcObject = this.webcamStream;
                appState.update('connection.isWebcamActive', true);
                webcamBtn.classList.add('active');
                webcamContainer.classList.remove('hidden');
            } catch (error) {
                console.error('Webcam error:', error);
                this.showError(i18n.t('error_cam_denied'));
            }
        } else {
            if (this.webcamStream) {
                this.webcamStream.getTracks().forEach(track => track.stop());
            }
            webcamPreview.srcObject = null;
            appState.update('connection.isWebcamActive', false);
            webcamBtn.classList.remove('active');
            webcamContainer.classList.add('hidden');
        }
    }

    captureWebcamFrame() {
        if (!appState.connection.isWebcamActive || !this.webcamStream) return null;

        const video = document.getElementById('webcam-preview');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Return as base64 string
        return canvas.toDataURL('image/jpeg', 0.6);
    }

    updateUiTranslations() {
        i18n.setLanguage(appState.language);

        // Sync Sidebar Language Dropdown
        const langSelect = document.getElementById('langSelect');
        if (langSelect) langSelect.value = appState.language;

        // Update Static Elements
        const mappings = {
            'overlay-title': 'start_overlay_title',
            'chat-title': 'title_chat',
            'backBtn': 'back_btn',
            'uploadBtn': 'upload_btn',
            'callBtn': 'call_btn',
            'webcamBtn': 'webcam_btn',
            'testSoundBtn': 'test_sound_btn',
            'opt-pers-professional': 'pers_professional',
            'opt-pers-friendly': 'pers_friendly',
            'opt-pers-academic': 'pers_academic',
            'opt-emoji': 'emoji_placeholder',
            'opt-exp-happy': 'exp_happy',
            'opt-exp-surprise': 'exp_surprise',
            'opt-exp-anger': 'exp_anger'
        };

        const iconButtonIds = ['backBtn', 'uploadBtn', 'callBtn', 'webcamBtn', 'testSoundBtn', 'micBtn'];

        for (const [id, key] of Object.entries(mappings)) {
            const element = document.getElementById(id);
            if (element) {
                const translated = i18n.t(key);

                if (iconButtonIds.includes(id)) {
                    // Update only tooltip for icon-only buttons
                    element.title = translated;
                } else {
                    const label = element.querySelector('.label');
                    if (label) {
                        label.textContent = translated;
                    } else {
                        if (element.tagName === 'OPTION' || element.tagName === 'H1' || element.tagName === 'H2' || element.tagName === 'P') {
                            element.textContent = translated;
                        } else if (element.tagName === 'SELECT') {
                            element.title = translated;
                        } else {
                            // Default fallback
                            element.textContent = translated;
                        }
                    }
                }
            }
        }

        const textInput = document.getElementById('textInput');
        if (textInput) textInput.placeholder = i18n.t('input_placeholder');
        const speakerSelect = document.getElementById('speakerSelect');
        if (speakerSelect) speakerSelect.title = i18n.t('speaker_select_title');
    }

    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.innerHTML = `
            <span class="material-symbols-outlined toast-icon">info</span>
            <span class="toast-text">${message}</span>
        `;
        document.body.appendChild(toast);
        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();

    // Cleanup on close
    window.addEventListener('beforeunload', () => {
        if (window.app) {
            if (window.app.audio) window.app.audio.dispose();
            if (window.app.webcamStream) {
                window.app.webcamStream.getTracks().forEach(track => track.stop());
            }
        }
    });
});