import { initScene } from './modules/scene/index.js';
import { AudioManager } from './modules/audio/AudioManager.js';
import { AvatarController } from './modules/avatar/AvatarController.js';
import { AvatarRenderer } from './modules/avatar/AvatarRenderer.js';
import { setupUiControls } from './components/UiControls/UiControls.js';
import { setupChat } from './components/Chat/Chat.js';
import { appState } from './modules/core/State.js';
import { i18n } from './modules/core/I18n.js';

console.log("🚀 VOXENTIA AI SYSTEM v3.0 LOADED");

class App {
    constructor() {
        this.sceneManager = null;
        this.avatar = null;
        this.avatarRenderer = null;
        this.audio = null;
        this.chat = null;
        this.ui = null;
    }

    async init() {
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

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError(i18n.t('error_initialization'));
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

    startVoiceRecognition() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this._mediaStream = stream;
                this._audioChunks = [];

                // Choose a supported MIME type
                const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm';

                this._mediaRecorder = new MediaRecorder(stream, { mimeType });

                this._mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) this._audioChunks.push(e.data);
                };

                this._mediaRecorder.onstop = async () => {
                    const blob = new Blob(this._audioChunks, { type: mimeType });
                    await this._sendToWhisper(blob, mimeType);
                };

                this._mediaRecorder.start();
                document.getElementById('micBtn').classList.add('active');
                if (this.audio) this.audio.isRecording = true;
            })
            .catch(err => {
                console.error('Microphone error:', err);
                this.showError('Microphone access denied.');
            });
    }

    stopVoiceRecognition() {
        if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
            this._mediaRecorder.stop();
        }
        if (this._mediaStream) {
            this._mediaStream.getTracks().forEach(t => t.stop());
            this._mediaStream = null;
        }
        document.getElementById('micBtn').classList.remove('active');
        if (this.audio) this.audio.isRecording = false;
    }

    async _sendToWhisper(audioBlob, mimeType) {
        const micBtn = document.getElementById('micBtn');
        const origText = micBtn.textContent;
        micBtn.textContent = '⏳ ...';
        micBtn.disabled = true;

        try {
            const formData = new FormData();
            const ext = mimeType.includes('webm') ? 'webm' : 'wav';
            formData.append('audio', audioBlob, `recording.${ext}`);
            formData.append('language', appState.language);

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Whisper error: ${response.status}`);

            const result = await response.json();
            const text = result.text?.trim();

            if (text && this.chat) {
                this.chat.addMessage('user', text);
                this.chat.handleSend(text);
            } else {
                this.showError(i18n.t('error_speech_unsupported') || 'No speech detected.');
            }
        } catch (err) {
            console.error('Whisper transcription failed:', err);
            this.showError('Voice recognition failed. Please try again.');
        } finally {
            micBtn.textContent = origText;
            micBtn.disabled = false;
        }
    }

    handleCallToggle() {
        appState.update('connection.isCallActive', !appState.connection.isCallActive);
        document.getElementById('callBtn').classList.toggle('active', appState.connection.isCallActive);
    }

    async handleWebcamToggle() {
        const webcamBtn = document.getElementById('webcamBtn');
        if (!appState.connection.isWebcamActive) {
            try {
                this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
                appState.update('connection.isWebcamActive', true);
                webcamBtn.classList.add('active');
            } catch (error) {
                this.showError(i18n.t('error_cam_denied'));
            }
        } else {
            if (this.webcamStream) this.webcamStream.getTracks().forEach(track => track.stop());
            appState.update('connection.isWebcamActive', false);
            webcamBtn.classList.remove('active');
        }
    }

    updateUiTranslations() {
        i18n.setLanguage(appState.language);
        
        // Update Static Elements
        const mappings = {
            'overlay-title': 'start_overlay_title',
            'overlay-desc': 'start_overlay_desc',
            'startBtn': 'start_btn',
            'micBtn': 'mic_btn',
            'testSoundBtn': 'test_sound_btn',
            'callBtn': 'call_btn',
            'webcamBtn': 'webcam_btn',
            'backBtn': 'back_btn',
            'chat-title': 'chat_header',
            'sendBtn': 'send_btn',
            'opt-avatar-1': 'avatar_label',
            'opt-voice-baya': 'voice_female_baya',
            'opt-voice-kseniya': 'voice_female_kseniya',
            'opt-voice-eugene': 'voice_male_eugene',
            'opt-voice-aidar': 'voice_male_aidar',
            'opt-emoji': 'emoji_placeholder'
        };

        for (const [id, key] of Object.entries(mappings)) {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'INPUT') el.placeholder = i18n.t(key);
                else el.textContent = i18n.t(key);
            }
        }

        const textInput = document.getElementById('textInput');
        if (textInput) textInput.placeholder = i18n.t('input_placeholder');

        const speakerSelect = document.getElementById('speakerSelect');
        if (speakerSelect) speakerSelect.title = i18n.t('speaker_select_title');
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});