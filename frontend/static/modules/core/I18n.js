/**
 * Internationalization (i18n) system for Voxentia AI
 */
export const translations = {
    en: {
        title: "Voxentia: AI Digital Assistant",
        start_overlay_title: "Voxentia Digital Assistant",
        start_overlay_desc: "Ready to chat? Click the button to activate sound and animation.",
        start_btn: "Start",
        mic_btn: "🎙️ Talk",
        test_sound_btn: "🔊 Test Sound",
        call_btn: "📹 Video Call",
        webcam_btn: "📷 Camera",
        avatar_label: "Avatar 1",
        speaker_select_title: "Select Voice",
        emoji_placeholder: "Emoji",
        chat_header: "Chat",
        input_placeholder: "Type a message...",
        send_btn: "Send",
        thinking: "... thinking ...",
        error_loading_model: "Loading new model...",
        error_model_loaded: "Model loaded successfully",
        error_model_change: "Error changing model",
        error_speech_unsupported: "Speech recognition not supported",
        error_cam_denied: "Camera access denied",
        error_chat_failed: "Error sending message",
        test_audio_start: "🔔 Starting audio test...",
        voice_female_baya: "Female (Baya)",
        voice_female_kseniya: "Female (Kseniya)",
        voice_male_eugene: "Male (Eugene)",
        voice_male_aidar: "Male (Aidar)",
        back_btn: "🏠 Start",
        error_mic_busy: "Microphone is busy or blocked by another app.",
        error_mic_failed: "Could not access microphone."
    },
    de: {
        title: "Voxentia: KI Digitaler Assistent",
        start_overlay_title: "Voxentia Digitaler Assistent",
        start_overlay_desc: "Bereit zum Chatten? Klicke auf die Schaltfläche, um Ton und Animation zu aktivieren.",
        start_btn: "Starten",
        mic_btn: "🎙️ Sprechen",
        test_sound_btn: "🔊 Tontest",
        call_btn: "📹 Videoanruf",
        webcam_btn: "📷 Kamera",
        avatar_label: "Avatar 1",
        speaker_select_title: "Stimme wählen",
        emoji_placeholder: "Emoji",
        chat_header: "Chat",
        input_placeholder: "Nachricht eingeben...",
        send_btn: "Senden",
        thinking: "... denkt nach ...",
        error_loading_model: "Lade neues Modell...",
        error_model_loaded: "Modell erfolgreich geladen",
        error_model_change: "Fehler beim Modellwechsel",
        error_speech_unsupported: "Spracherkennung nicht unterstützt",
        error_cam_denied: "Kamerazugriff verweigert",
        error_chat_failed: "Fehler beim Senden der Nachricht",
        test_audio_start: "🔔 Starte Audiotest...",
        voice_female_baya: "Weiblich (Baya)",
        voice_female_kseniya: "Weiblich (Kseniya)",
        voice_male_eugene: "Männlich (Eugene)",
        voice_male_aidar: "Männlich (Aidar)",
        back_btn: "🏠 Startseite",
        error_mic_busy: "Mikrofon ist belegt oder blockiert. Tipp: Prüfe in den Windows-Soundeinstellungen, ob der 'Exklusive Modus' aktiv ist oder ob die Datenschutz-Einstellungen den Zugriff erlauben.",
        error_mic_failed: "Mikrofonzugriff nicht möglich."
    },
    ru: {
        title: "Voxentia: Цифровой Ассистент",
        start_overlay_title: "Цифровой Ассистент Voxentia",
        start_overlay_desc: "Готовы к общению? Нажмите кнопку для активации звука и анимации.",
        start_btn: "Запустить",
        mic_btn: "🎙️ Говорить",
        test_sound_btn: "🔊 Тест звука",
        call_btn: "📹 Видеозвонок",
        webcam_btn: "📷 Камера",
        avatar_label: "Аватар 1",
        speaker_select_title: "Выберите голос",
        emoji_placeholder: "Эмодзи",
        chat_header: "Чат",
        input_placeholder: "Введите сообщение...",
        send_btn: "Отправить",
        thinking: "... думает ...",
        error_loading_model: "Загрузка новой модели...",
        error_model_loaded: "Модель успешно загружена",
        error_model_change: "Ошибка при смене модели",
        error_speech_unsupported: "Распознавание речи не поддерживается",
        error_cam_denied: "Доступ к камере запрещен",
        error_chat_failed: "Ошибка при отправке сообщения",
        test_audio_start: "🔔 Запуск теста звука...",
        voice_female_baya: "Женский (Бая)",
        voice_female_kseniya: "Женский (Ксения)",
        voice_male_eugene: "Мужской (Евгений)",
        voice_male_aidar: "Мужской (Айдар)",
        back_btn: "🏠 На главную",
        error_mic_busy: "Микрофон занят или заблокирован другим приложением.",
        error_mic_failed: "Не удалось получить доступ к микрофону."
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
