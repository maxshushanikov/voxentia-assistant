import { appState } from '../../modules/core/State.js';
import { i18n } from '../../modules/core/I18n.js';

export class UiControls {
    constructor(appInstance) {
        this.app = appInstance;
    }

    init() {
        const micBtn = document.getElementById('micBtn');
        const callBtn = document.getElementById('callBtn');
        const webcamBtn = document.getElementById('webcamBtn');
        const emojiSelect = document.getElementById('emojiSelect');
        const modelSelect = document.getElementById('modelSelect');
        const testSoundBtn = document.getElementById('testSoundBtn');
        const langButtons = document.querySelectorAll('.lang-btn');
        const speakerSelect = document.getElementById('speakerSelect');

        if (micBtn) micBtn.addEventListener('click', () => this.app.handleMicToggle());
        if (callBtn) callBtn.addEventListener('click', () => this.app.handleCallToggle());
        if (webcamBtn) webcamBtn.addEventListener('click', () => this.app.handleWebcamToggle());

        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('file', file);

                const originalText = uploadBtn.textContent;
                uploadBtn.textContent = '⏳ ...';
                uploadBtn.disabled = true;

                try {
                    // Get API host dynamically from the current URL if possible, fallback to localhost:8000
                    const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                        ? `http://${window.location.hostname}:8000/api/documents/upload`
                        : '/api/documents/upload';

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        uploadBtn.textContent = '✅ OK';
                    } else {
                        const err = await response.json();
                        alert('Upload failed: ' + (err.detail || 'Unknown error'));
                        uploadBtn.textContent = '❌ Fail';
                    }
                } catch (error) {
                    console.error('Upload error:', error);
                    uploadBtn.textContent = '❌ Error';
                } finally {
                    setTimeout(() => {
                        uploadBtn.textContent = originalText;
                        uploadBtn.disabled = false;
                    }, 3000);
                    fileInput.value = '';
                }
            });
        }

        if (testSoundBtn) {
            testSoundBtn.addEventListener('click', async () => {
                console.log('🔘 Test Sound Button Clicked');
                if (this.app.showError) this.app.showError('🔔 Starting Audio Test...');

                await this.app.resumeAudio();
                if (this.app.audio) {
                    this.app.audio.playTestSound();
                } else {
                    console.error('❌ Audio Manager not found on app instance');
                }
            });
        }

        if (emojiSelect) {
            emojiSelect.addEventListener('change', (e) => {
                if (this.app.avatar) this.app.avatar.setEmotion(e.target.value);
            });
        }

        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => this.app.handleModelChange(e.target.value));
        }

        if (speakerSelect) {
            speakerSelect.addEventListener('change', (e) => {
                const speakerId = e.target.value;
                const lang = appState.language;
                const voice = appState.voices[lang].find(v => v.id === speakerId);

                if (voice) {
                    appState.update('avatar.speaker', speakerId);
                    const oldGender = appState.avatar.gender;
                    appState.update('avatar.gender', voice.gender);

                    // Switch model if gender changed
                    if (oldGender !== voice.gender) {
                        const modelPath = voice.gender === 'feminine'
                            ? '/assets/avatar_feminine.glb'
                            : '/assets/avatar_masculine.glb';
                        this.app.handleModelChange(modelPath);
                    }
                }
            });
        }

        // Language Selection Handling
        if (langButtons) {
            langButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const lang = btn.getAttribute('data-lang');
                    appState.update('language', lang);

                    // Update active button state
                    langButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Trigger UI translation update FIRST
                    if (this.app.updateUiTranslations) {
                        this.app.updateUiTranslations();
                    }

                    // Update Speaker Dropdown for the new language AFTER translations are updated
                    this.updateSpeakerDropdown(lang);
                });
            });
        }

        const startBtn = document.getElementById('startBtn');
        const startOverlay = document.getElementById('start-overlay');
        const mainLayout = document.getElementById('mainLayout');

        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                await this.app.resumeAudio();
                startOverlay.classList.add('fade-out');

                setTimeout(() => {
                    startOverlay.classList.add('hidden');
                    mainLayout.classList.remove('hidden');
                    window.dispatchEvent(new Event('resize'));
                    const textInput = document.getElementById('textInput');
                    if (textInput) textInput.focus();
                }, 500);
            });
        }

        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Clear chat and reset session to prevent cross-language context
                appState.update('chat.messages', []);
                appState.update('session.sessionId', 'session_' + Math.random().toString(36).substr(2, 9));

                mainLayout.classList.add('hidden');
                startOverlay.classList.remove('hidden', 'fade-out');
            });
        }
    }

    updateSpeakerDropdown(lang) {
        const speakerSelect = document.getElementById('speakerSelect');
        if (!speakerSelect) return;

        const voices = appState.voices[lang] || [];
        speakerSelect.innerHTML = '';

        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.id;
            // FIX 1 ermöglicht diesen Aufruf — i18n ist jetzt importiert
            const translatedName = i18n.t(voice.name);
            option.textContent = translatedName;
            speakerSelect.appendChild(option);
        });

        // Trigger change for the first voice in the new language
        if (voices.length > 0) {
            speakerSelect.value = voices[0].id;
            speakerSelect.dispatchEvent(new Event('change'));
        }
    }
}

export function setupUiControls(appInstance) {
    const controls = new UiControls(appInstance);
    controls.init();
    return controls;
}