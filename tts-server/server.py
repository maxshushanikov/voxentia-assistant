import os
import torch
import hashlib
import traceback
import re
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuration
AUDIO_PATH = Path("/app/audio")
AUDIO_PATH.mkdir(exist_ok=True)

device = torch.device('cpu')
torch.set_num_threads(4)

# Models cache
models = {}

def get_model(language):
    if language in models:
        return models[language]
    
    print(f"Loading Silero TTS model for language: {language}...")
    # Map requested language to Silero model names
    lang_map = {
        'ru': ('ru', 'v4_ru'),
        'en': ('en', 'v3_en'),
        'de': ('de', 'v3_de')
    }
    
    if language not in lang_map:
        print(f"Language {language} not supported, falling back to English")
        language = 'en'
        
    silero_lang, silero_model = lang_map[language]
    
    try:
        model, _ = torch.hub.load(
            repo_or_dir='snakers4/silero-models',
            model='silero_tts',
            language=silero_lang,
            speaker=silero_model,
            trust_repo=True
        )
        model.to(device)
        models[language] = model
        print(f"Model for {language} loaded successfully")
        return model
    except Exception as e:
        print(f"Error loading model for {language}: {e}")
        return None

# Pre-load default language (Russian as requested previously, or English)
get_model('ru')
get_model('en')
get_model('de')

def sanitize_text(text):
    """Removes markdown and actions from text before TTS."""
    if not text:
        return ""
    # Remove markdown asterisks, backticks, tildes
    text = re.sub(r'[*_~`]', '', text)
    # Remove bracketed/parenthesized text (like [laughs], (smiles))
    text = re.sub(r'\[.*?\]|\(.*?\)', '', text)
    # Replace newlines with spaces
    text = text.replace('\n', ' ').replace('\r', ' ')
    # Condense multiple spaces
    text = re.sub(r'  +', ' ', text)
    return text.strip()

def split_text(text, max_chars=250):
    """Splits text into chunks of max_chars, preferably at sentence boundaries."""
    # Split by punctuation but keep the punctuation
    parts = re.split(r'([.!?]+)', text)
    chunks = []
    current_chunk = ""
    
    for i in range(0, len(parts), 2):
        sentence = parts[i]
        punct = parts[i+1] if i+1 < len(parts) else ""
        full_sentence = sentence + punct
        
        if len(current_chunk) + len(full_sentence) < max_chars:
            current_chunk += full_sentence
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = full_sentence
            
    if current_chunk:
        chunks.append(current_chunk.strip())
        
    return chunks

@app.route("/tts", methods=["POST"])
def tts():
    try:
        data = request.json
        text = data.get("text", "")
        speaker = data.get("speaker", "baya")
        language = data.get("language", "ru")
        
        print(f"🔊 [TTS] GENERATING AUDIO | Language: {language} | Speaker: {speaker} | Text: {text[:50]}...")
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
            
        model = get_model(language)
        if not model:
            return jsonify({"error": f"Model for {language} not available"}), 500

        sample_rate = 48000
        
        # Split text into manageable chunks
        text_chunks = split_text(text)
        print(f"Generating TTS for {len(text_chunks)} chunks...")
        
        audio_tensors = []
        for chunk in text_chunks:
            if not chunk.strip():
                continue
            
            # For EN/DE models, speakers might be different. 
            # Silero v3_en speakers: en_0, en_1, ... en_117
            # Silero v3_de speakers: de_0, de_1, de_2, de_3, de_4, de_5
            # We map generic names if needed
            effective_speaker = speaker
            if language == 'en':
                en_map = {'baya': 'en_0', 'kseniya': 'en_2', 'eugene': 'en_1', 'aidar': 'en_3'}
                effective_speaker = en_map.get(speaker, 'en_0')
            elif language == 'de':
                de_map = {'baya': 'eva_k', 'kseniya': 'hokuspokus', 'eugene': 'bernd_ungerer', 'aidar': 'friedrich'}
                effective_speaker = de_map.get(speaker, 'eva_k')

            # Skip chunk if it only contains punctuation or spaces
            clean_chunk = sanitize_text(chunk)
            if not clean_chunk or re.fullmatch(r'[.,!?;\-\s]+', clean_chunk):
                continue

            try:
                chunk_audio = model.apply_tts(
                    text=clean_chunk,
                    speaker=effective_speaker,
                    sample_rate=sample_rate
                )
                audio_tensors.append(chunk_audio)
            except Exception as e:
                print(f"Error in apply_tts for chunk '{clean_chunk[:20]}': {e}")
                # Try fallback speaker if current one fails
                fallback = 'en_0' if language == 'en' else ('eva_k' if language == 'de' else 'baya')
                try:
                    chunk_audio = model.apply_tts(text=clean_chunk, speaker=fallback, sample_rate=sample_rate)
                    audio_tensors.append(chunk_audio)
                except Exception as e2:
                    print(f"Fallback apply_tts also failed for chunk '{clean_chunk[:20]}': {e2}")
            
        if not audio_tensors:
            print("Warning: Failed to generate any audio tensors. Returning empty or error.")
            return jsonify({"error": "Failed to generate audio for any text chunk"}), 500

        full_audio = torch.cat(audio_tensors)
        
        text_hash = hashlib.md5(f"{language}:{speaker}:{text}".encode()).hexdigest()
        filename = f"{text_hash}.wav"
        filepath = AUDIO_PATH / filename
        
        import torchaudio
        torchaudio.save(str(filepath), full_audio.unsqueeze(0), sample_rate)
        
        print(f"✅ [TTS] Saved to {filename}", flush=True)
        
        return jsonify({
            "audio_url": f"/audio/{filename}",
            "filename": filename
        })
        
    except Exception as e:
        print(f"TTS error: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/audio/<filename>")
def get_audio(filename):
    return send_from_directory(AUDIO_PATH, filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)