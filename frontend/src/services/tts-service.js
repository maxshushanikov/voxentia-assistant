/**
 * Service für die Sprachausgabe und das Audio-Management.
 */
export const TTSService = {
    async play(audioUrl, app) {
        if (!audioUrl) return;
        
        try {
            console.log(`🔊 Audio wird abgespielt: ${audioUrl}`);
            
            // Avatar in Sprech-Modus versetzen
            if (app.avatar) app.avatar.setSpeaking(true);
            
            await app.audio.playAudio(audioUrl);
            
        } catch (error) {
            console.error("Fehler bei der Audio-Wiedergabe:", error);
        } finally {
            if (app.avatar) app.avatar.setSpeaking(false);
        }
    }
};
