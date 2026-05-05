/**
 * Internationalization (i18n) system for Voxentia AI
 */
export const translations = {
    en: {
        title: "Voxentia: AI Digital Assistant",
        start_overlay_title: "Voxentia Digital Assistant",
        start_overlay_desc: "Ready to chat? Click the button to activate sound and animation.",
        start_btn: "Start",
        mic_btn: "Talk",
        test_sound_btn: "Test Sound",
        call_btn: "Video Call",
        webcam_btn: "Camera",
        upload_btn: "Upload",
        title_chat: "Chat",
        input_placeholder: "Type a message...",
        send_btn: "Send",
        thinking: "... thinking ...",
        error_loading_model: "Loading new model...",
        error_model_loaded: "Model loaded successfully",
        error_model_change: "Error changing model",
        error_speech_unsupported: "Speech recognition not supported",
        error_cam_denied: "Camera access denied",
        error_chat_failed: "Error sending message",
        test_audio_start: "Starting audio test...",
        voice_female_baya: "Assistant Baya",
        voice_female_kseniya: "Assistant Kseniya",
        voice_male_eugene: "Assistant Eugene",
        voice_male_aidar: "Assistant Aidar",
        back_btn: "Home",
        error_mic_busy: "Microphone is busy or blocked.",
        error_mic_failed: "Could not access microphone.",
        personality_label: "Persona",
        pers_professional: "Expert Advisor",
        pers_friendly: "Friendly Companion",
        pers_academic: "Academic Tutor",
        emoji_placeholder: "Facial Expression",
        exp_neutral: "Neutral",
        exp_happy: "Friendly Smile",
        exp_surprise: "Surprise",
        exp_anger: "Focus/Anger",
        upload_success: "Document processed! Context updated."
    },
    de: {
        title: "Voxentia: KI Digitaler Assistent",
        start_overlay_title: "Voxentia Digitaler Assistent",
        start_overlay_desc: "Bereit zum Chatten? Klicke auf die Schaltfläche, um Ton und Animation zu aktivieren.",
        start_btn: "Starten",
        mic_btn: "Sprechen",
        test_sound_btn: "Tontest",
        call_btn: "Videoanruf",
        webcam_btn: "Kamera",
        upload_btn: "Upload",
        title_chat: "Chat",
        input_placeholder: "Nachricht eingeben...",
        send_btn: "Senden",
        thinking: "... denkt nach ...",
        error_loading_model: "Lade neues Modell...",
        error_model_loaded: "Modell erfolgreich geladen",
        error_model_change: "Fehler beim Modellwechsel",
        error_speech_unsupported: "Spracherkennung nicht unterstützt",
        error_cam_denied: "Kamerazugriff verweigert",
        error_chat_failed: "Fehler beim Senden der Nachricht",
        test_audio_start: "Starte Audiotest...",
        voice_female_baya: "Assistentin Baya",
        voice_female_kseniya: "Assistentin Kseniya",
        voice_male_eugene: "Assistent Eugene",
        voice_male_aidar: "Assistent Aidar",
        back_btn: "Startseite",
        error_mic_busy: "Mikrofon ist belegt oder blockiert.",
        error_mic_failed: "Mikrofonzugriff nicht möglich.",
        personality_label: "Persona",
        pers_professional: "Experten-Berater",
        pers_friendly: "Freundlicher Begleiter",
        pers_academic: "Akademischer Tutor",
        emoji_placeholder: "Gesichtsausdruck",
        exp_neutral: "Neutral",
        exp_happy: "Freundliches Lächeln",
        exp_surprise: "Erstaunt",
        exp_anger: "Fokussiert / Ernst",
        upload_success: "Dokument verarbeitet! Kontext aktualisiert."
    },
    ru: {
        title: "Voxentia: Цифровой Ассистент",
        start_overlay_title: "Цифровой Ассистент Voxentia",
        start_overlay_desc: "Готовы к общению? Нажмите кнопку для активации звука и анимации.",
        start_btn: "Запустить",
        mic_btn: "Говорить",
        test_sound_btn: "Тест звука",
        call_btn: "Видеозвонок",
        webcam_btn: "Камера",
        upload_btn: "Загрузить",
        title_chat: "Чат",
        input_placeholder: "Введите сообщение...",
        send_btn: "Отправить",
        thinking: "... думает ...",
        error_loading_model: "Загрузка новой модели...",
        error_model_loaded: "Модель успешно загружена",
        error_model_change: "Ошибка при смене модели",
        error_speech_unsupported: "Распознавание речи не поддерживается",
        error_cam_denied: "Доступ к камере запрещен",
        error_chat_failed: "Ошибка при отправке сообщения",
        test_audio_start: "Запуск теста звука...",
        voice_female_baya: "Ассистент Бая",
        voice_female_kseniya: "Ассистент Ксения",
        voice_male_eugene: "Ассистент Евгений",
        voice_male_aidar: "Ассистент Айдар",
        back_btn: "На главную",
        error_mic_busy: "Микрофон занят или заблокирован.",
        error_mic_failed: "Нет доступа к микрофону.",
        personality_label: "Персона",
        pers_professional: "Эксперт-консультант",
        pers_friendly: "Дружелюбный помощник",
        pers_academic: "Академический наставник",
        emoji_placeholder: "Мимика",
        exp_neutral: "Нейтрально",
        exp_happy: "Улыбка",
        exp_surprise: "Удивление",
        exp_anger: "Серьёзно / Гнев",
        upload_success: "Документ обработан! Контекст обновлен."
    }
};

export class I18n {
    constructor(lang = 'en') {
        this.lang = lang;
    }

    setLanguage(lang) {
        if (translations[lang]) {
            this.lang = lang;
        }
    }

    t(key) {
        return translations[this.lang][key] || key;
    }
}

export const i18n = new I18n('en');
