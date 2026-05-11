/**
 * UI-Wrapper für den 3D-Avatar.
 */
export const AvatarDisplay = {
    async init(app) {
        this.app = app;
        console.log("🎭 Avatar Display initialisiert");
    },

    setEmotion(emotion) {
        if (this.app.avatar) {
            this.app.avatar.setEmotion(emotion);
        }
    },

    setSpeaking(isSpeaking) {
        if (this.app.avatar) {
            this.app.avatar.setSpeaking(isSpeaking);
        }
        const wave = document.getElementById('voiceWave');
        if (wave) {
            isSpeaking ? wave.classList.add('active') : wave.classList.remove('active');
        }
    },

    setThinking(isThinking) {
        const bubble = document.getElementById('thinkingBubble');
        if (bubble) {
            isThinking ? bubble.classList.remove('hidden') : bubble.classList.add('hidden');
        }
    }
};
