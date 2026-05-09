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
    }
};
