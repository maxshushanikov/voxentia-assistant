from app.services.voice_service import sanitize_for_tts


def test_sanitize_for_tts_removes_emotion_tags():
    text = "Hello [happy] world [think] this is fine."
    assert "[happy]" not in sanitize_for_tts(text)
    assert "Hello" in sanitize_for_tts(text)


def test_sanitize_for_tts_empty_after_tags_only():
    assert sanitize_for_tts("[laugh] [think]") == ""
