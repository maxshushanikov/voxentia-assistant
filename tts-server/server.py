import hashlib
import logging
import os
import re
import time
import traceback
from pathlib import Path

import torch
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("tts-server")

AUDIO_PATH = Path(os.getenv("AUDIO_PATH", "/app/tts-cache"))
AUDIO_PATH.mkdir(parents=True, exist_ok=True)
MAX_AUDIO_AGE_SECONDS = int(os.getenv("TTS_CACHE_MAX_AGE_SECONDS", str(7 * 24 * 3600)))

use_cuda_env = os.getenv("USE_CUDA", "false").lower() in ("true", "1", "yes")
if use_cuda_env and torch.cuda.is_available():
    device = torch.device("cuda")
    logger.info("CUDA GPU support is enabled and available for Silero TTS.")
else:
    device = torch.device("cpu")
    torch.set_num_threads(4)
    logger.info("Using CPU for Silero TTS.")

models = {}


MAX_CACHE_SIZE_MB = int(os.getenv("TTS_CACHE_MAX_SIZE_MB", "500"))


def cleanup_stale_audio() -> int:
    """Remove wav files older than MAX_AUDIO_AGE_SECONDS or if cache size exceeds limit."""
    removed = 0
    now = time.time()
    for wav in AUDIO_PATH.glob("*.wav"):
        try:
            if now - wav.stat().st_mtime > MAX_AUDIO_AGE_SECONDS:
                wav.unlink()
                removed += 1
        except OSError as e:
            logger.warning("Could not remove %s: %s", wav, e)

    try:
        max_bytes = MAX_CACHE_SIZE_MB * 1024 * 1024
        wav_files = []
        total_size = 0
        for wav in AUDIO_PATH.glob("*.wav"):
            stat = wav.stat()
            total_size += stat.st_size
            wav_files.append((stat.st_mtime, stat.st_size, wav))

        if total_size > max_bytes:
            # Sort oldest first
            wav_files.sort(key=lambda x: x[0])
            for _, size, filepath in wav_files:
                if total_size <= max_bytes:
                    break
                try:
                    filepath.unlink()
                    total_size -= size
                    removed += 1
                except OSError as e:
                    logger.warning("Could not remove %s during size limit cleanup: %s", filepath, e)
    except Exception as e:
        logger.error("Error during cache folder size cleanup: %s", e)

    if removed:
        logger.info("Cleaned up %d stale/overflow audio file(s)", removed)
    return removed


def get_model(language: str):
    if language in models:
        return models[language]

    logger.info("Loading Silero TTS model for language: %s", language)
    lang_map = {
        "ru": ("ru", "v4_ru"),
        "en": ("en", "v3_en"),
        "de": ("de", "v3_de"),
    }

    if language not in lang_map:
        logger.warning("Language %s not supported, falling back to English", language)
        language = "en"

    silero_lang, silero_model = lang_map[language]

    try:
        model, _ = torch.hub.load(
            repo_or_dir="snakers4/silero-models",
            model="silero_tts",
            language=silero_lang,
            speaker=silero_model,
            trust_repo=True,
        )
        model.to(device)
        models[language] = model
        logger.info("Model for %s loaded successfully", language)
        return model
    except Exception as e:
        logger.error("Error loading model for %s: %s", language, e)
        return None


def sanitize_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"[*_~`]", "", text)
    text = re.sub(r"\[.*?\]|\(.*?\)", "", text)
    text = text.replace("\n", " ").replace("\r", " ")
    text = re.sub(r"  +", " ", text)
    return text.strip()


def split_text(text: str, max_chars: int = 250) -> list[str]:
    """Split on sentence boundaries; avoids re.split empty-string edge cases."""
    if not text:
        return []
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if not sentences:
        return [text[:max_chars]] if text else []

    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= max_chars:
            current = f"{current} {sentence}".strip()
        else:
            if current:
                chunks.append(current)
            if len(sentence) <= max_chars:
                current = sentence
            else:
                for i in range(0, len(sentence), max_chars):
                    chunks.append(sentence[i : i + max_chars])
                current = ""
    if current:
        chunks.append(current)
    return chunks


@app.route("/health")
def health():
    return jsonify({"status": "healthy", "service": "tts-server"})


@app.route("/tts", methods=["POST"])
def tts():
    try:
        cleanup_stale_audio()
        data = request.json or {}
        raw_text = data.get("text", "")
        speaker = data.get("speaker", "baya")
        language = data.get("language", "en")
        text = sanitize_text(raw_text)

        logger.info(
            "TTS request | lang=%s speaker=%s chars=%d",
            language,
            speaker,
            len(text),
        )

        if not text:
            return jsonify({"error": "No speakable text after sanitization"}), 400

        model = get_model(language)
        if not model:
            return jsonify({"error": f"Model for {language} not available"}), 500

        sample_rate = 48000
        text_chunks = split_text(text)
        logger.info("Generating TTS for %d chunk(s)", len(text_chunks))

        audio_tensors = []
        for chunk in text_chunks:
            if not chunk.strip():
                continue

            effective_speaker = speaker
            if language == "en":
                en_map = {"baya": "en_0", "kseniya": "en_2", "eugene": "en_1", "aidar": "en_3"}
                effective_speaker = en_map.get(speaker, "en_0")
            elif language == "de":
                de_map = {
                    "baya": "eva_k",
                    "kseniya": "hokuspokus",
                    "eugene": "bernd_ungerer",
                    "aidar": "friedrich",
                }
                effective_speaker = de_map.get(speaker, "eva_k")

            clean_chunk = chunk.strip()
            if not clean_chunk or re.fullmatch(r"[.,!?;\-\s]+", clean_chunk):
                continue

            try:
                chunk_audio = model.apply_tts(
                    text=clean_chunk,
                    speaker=effective_speaker,
                    sample_rate=sample_rate,
                )
                audio_tensors.append(chunk_audio)
            except Exception as e:
                logger.warning("apply_tts failed for chunk: %s", e)
                fallback = "en_0" if language == "en" else ("eva_k" if language == "de" else "baya")
                try:
                    chunk_audio = model.apply_tts(
                        text=clean_chunk, speaker=fallback, sample_rate=sample_rate
                    )
                    audio_tensors.append(chunk_audio)
                except Exception as e2:
                    logger.error("Fallback apply_tts failed: %s", e2)

        if not audio_tensors:
            return jsonify({"error": "Failed to generate audio for any text chunk"}), 500

        full_audio = torch.cat(audio_tensors)
        text_hash = hashlib.md5(f"{language}:{speaker}:{text}".encode()).hexdigest()
        filename = f"{text_hash}.wav"
        filepath = AUDIO_PATH / filename

        import torchaudio

        torchaudio.save(str(filepath), full_audio.unsqueeze(0), sample_rate)
        logger.info("Saved TTS audio: %s", filename)

        return jsonify({"audio_url": f"/audio/{filename}", "filename": filename})

    except Exception as e:
        logger.exception("TTS error: %s", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/audio/<filename>")
def get_audio(filename):
    return send_from_directory(AUDIO_PATH, filename)


# Warm up models on startup
try:
    logger.info("Warming up TTS models on startup (en, de, ru)...")
    for lang in ["en", "de", "ru"]:
        get_model(lang)
except Exception as e:
    logger.error("Failed to warm up models: %s", e)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
