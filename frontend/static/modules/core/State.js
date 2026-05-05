/**
 * Centralized State Management for the Digital Avatar App
 */
export class State {
    constructor() {
        const savedSessionId = localStorage.getItem('voxentia_session_id');
        const sessionId = savedSessionId || 'session_' + Math.random().toString(36).substr(2, 9);
        if (!savedSessionId) {
            localStorage.setItem('voxentia_session_id', sessionId);
        }

        this.session = {
            status: 'disconnected', // disconnected, connecting, connected, error
            sessionId: sessionId
        };

        this.chat = {
            messages: [],
            isSending: false,
            lastResponseTime: 0
        };

        this.avatar = {
            isSpeaking: false,
            currentModel: '/assets/avatar_masculine.glb', // Default
            gender: 'masculine',
            speaker: 'eugene',
            emotion: 'neutral',
            personality: 'professional'
        };

        this.voices = {
            // FIX: Englische IDs waren 'en_1' / 'en_2' — TTS-Server erwartet echte Stimmen-IDs
            en: [
                { id: 'baya', name: 'voice_female_baya', gender: 'feminine' },
                { id: 'kseniya', name: 'voice_female_kseniya', gender: 'feminine' },
                { id: 'eugene', name: 'voice_male_eugene', gender: 'masculine' },
                { id: 'aidar', name: 'voice_male_aidar', gender: 'masculine' }
            ],
            de: [
                { id: 'baya', name: 'voice_female_baya', gender: 'feminine' },
                { id: 'kseniya', name: 'voice_female_kseniya', gender: 'feminine' },
                { id: 'eugene', name: 'voice_male_eugene', gender: 'masculine' },
                { id: 'aidar', name: 'voice_male_aidar', gender: 'masculine' }
            ],
            ru: [
                { id: 'baya', name: 'voice_female_baya', gender: 'feminine' },
                { id: 'kseniya', name: 'voice_female_kseniya', gender: 'feminine' },
                { id: 'eugene', name: 'voice_male_eugene', gender: 'masculine' },
                { id: 'aidar', name: 'voice_male_aidar', gender: 'masculine' }
            ]
        };

        this.connection = {
            isWebcamActive: false,
            isCallActive: false
        };

        this.language = 'en';
        this.toolsEnabled = true;
        this.activeDocument = null;

        this.listeners = [];
    }

    /**
     * Subscribe to state changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Update state and notify listeners
     */
    update(path, value) {
        const parts = path.split('.');
        let current = this;
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        this.notify();
    }

    notify() {
        this.listeners.forEach(callback => callback(this));
    }
}

export const appState = new State();