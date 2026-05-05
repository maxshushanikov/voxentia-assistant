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
        const modelSelect = document.getElementById('modelSelect');
        const testSoundBtn = document.getElementById('testSoundBtn');
        const startLangButtons = document.querySelectorAll('.start-lang-btn');
        const personaSelect = document.getElementById('personaSelect');
        const speakerSelect = document.getElementById('speakerSelect');
        const toggleSearch = document.getElementById('toggleSearch');
        const inputAttachBtn = document.getElementById('inputAttachBtn');
        const topProgress = document.getElementById('topProgress');

        // Initial Tool Chip State
        if (toggleSearch && appState.toolsEnabled) {
            toggleSearch.classList.add('active');
        }

        // Handle Search Toggle
        if (toggleSearch) {
            toggleSearch.addEventListener('click', () => {
                const newState = !appState.toolsEnabled;
                appState.update('toolsEnabled', newState);
                toggleSearch.classList.toggle('active', newState);
                console.log(`🔍 Tools (Search) enabled: ${newState}`);
                
                if (this.app.showError) {
                    const msg = newState ? 'Web Search Enabled' : 'Web Search Disabled';
                    this.app.showError(msg);
                }
            });
        }

        // Handle Start Screen Language Buttons
        startLangButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                startLangButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const lang = btn.getAttribute('data-lang');

                this.applyLanguageChange(lang);
                console.log(`🌐 Language changed via Start-Btn to: ${lang}`);
            });
        });

        // Handle Persona Select
        if (personaSelect) {
            personaSelect.addEventListener('change', (e) => {
                const persona = e.target.value;
                appState.update('avatar.personality', persona);
                console.log(`🎭 Persona changed to: ${persona}`);
            });
        }

        const langSelect = document.getElementById('langSelect');

        // Handle Language Select (Live switching)
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                const lang = e.target.value;
                
                // Sync with start screen buttons
                startLangButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
                });

                if (this.app.handleLanguageChange) {
                    this.app.handleLanguageChange(lang);
                } else {
                    appState.update('language', lang);
                }
                console.log(`🌐 Language changed to: ${lang}`);
            });
        }

        if (micBtn) micBtn.addEventListener('click', () => this.app.handleMicToggle());
        if (callBtn) callBtn.addEventListener('click', () => this.app.handleCallToggle());
        if (webcamBtn) webcamBtn.addEventListener('click', () => this.app.handleWebcamToggle());

        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');
        
        const triggerUpload = () => fileInput.click();

        if (uploadBtn) uploadBtn.addEventListener('click', triggerUpload);
        if (inputAttachBtn) inputAttachBtn.addEventListener('click', triggerUpload);

        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('file', file);

                if (topProgress) topProgress.classList.remove('hidden');
                uploadBtn.disabled = true;

                try {
                    const apiUrl = '/api/documents/upload';
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        appState.update('activeDocument', file.name);
                        this.updateActiveDocumentIndicator(file.name);
                        if (this.app.showError) this.app.showError('✅ ' + (i18n.t('upload_success') || 'Document uploaded successfully'));
                    } else {
                        const err = await response.json();
                        if (this.app.showError) this.app.showError('❌ ' + (err.detail || 'Upload failed'));
                    }
                } catch (error) {
                    console.error('Upload error:', error);
                    if (this.app.showError) this.app.showError('❌ Error connecting to server');
                } finally {
                    if (topProgress) topProgress.classList.add('hidden');
                    uploadBtn.disabled = false;
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




        const startBtn = document.getElementById('startBtn');
        const startOverlay = document.getElementById('start-overlay');
        const mainLayout = document.getElementById('mainLayout');

        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                await this.app.resumeAudio();
                if (this.app.chat) await this.app.chat.clearChat();
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
            backBtn.addEventListener('click', async () => {
                // Clear chat and reset session to prevent cross-language context
                if (this.app.chat) await this.app.chat.clearChat();
                appState.update('activeDocument', null);
                this.updateActiveDocumentIndicator(null);
                appState.update('session.sessionId', 'session_' + Math.random().toString(36).substr(2, 9));

                mainLayout.classList.add('hidden');
                startOverlay.classList.remove('hidden', 'fade-out');
            });
        }
    }

    updateActiveDocumentIndicator(filename) {
        const indicator = document.getElementById('activeDocIndicator');
        if (!indicator) return;

        if (filename) {
            indicator.classList.remove('hidden');
            const nameEl = indicator.querySelector('.doc-name');
            if (nameEl) nameEl.textContent = filename;
        } else {
            indicator.classList.add('hidden');
        }
    }

    applyLanguageChange(lang) {
        appState.update('language', lang);

        // Sync dropdown
        const langSelect = document.getElementById('langSelect');
        if (langSelect) langSelect.value = lang;

        // Trigger UI translation update FIRST
        if (this.app.updateUiTranslations) {
            this.app.updateUiTranslations();
        }

        // Update Speaker Dropdown for the new language AFTER translations are updated
        this.updateSpeakerDropdown(lang);
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