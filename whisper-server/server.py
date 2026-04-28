import os
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel

app = Flask(__name__)
CORS(app)

# Use tiny model for speed - works well for short voice commands
# Options: tiny, base, small, medium, large-v3
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "base")

print(f"Loading Whisper model: {MODEL_SIZE}...")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
print(f"Whisper model '{MODEL_SIZE}' loaded successfully!")

# Language code mapping
LANG_MAP = {
    "en": "en",
    "de": "de",
    "ru": "ru"
}

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    language = request.form.get("language", "en")
    whisper_lang = LANG_MAP.get(language, "en")

    # Save to temp file
    suffix = Path(audio_file.filename).suffix if audio_file.filename else ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language=whisper_lang,
            beam_size=5,
            vad_filter=True,          # Filter out silence
            vad_parameters=dict(min_silence_duration_ms=300)
        )

        transcript = " ".join([seg.text for seg in segments]).strip()
        print(f"🎙️ Transcribed [{whisper_lang}]: {transcript}")

        return jsonify({
            "text": transcript,
            "language": info.language,
            "duration": info.duration
        })
    except Exception as e:
        print(f"Transcription error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        os.unlink(tmp_path)

@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": MODEL_SIZE})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
