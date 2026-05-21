FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

COPY server.py .

RUN mkdir -p /app/tts-cache

# Предзагрузка моделей при сборке образа
RUN python -c "import torch; torch.hub.load('snakers4/silero-models', 'silero_tts', language='en', speaker='v3_en'); torch.hub.load('snakers4/silero-models', 'silero_tts', language='de', speaker='v3_de'); torch.hub.load('snakers4/silero-models', 'silero_tts', language='ru', speaker='v4_ru')"

ENV PORT=5002 \
    HOST=0.0.0.0

EXPOSE 5002

CMD ["python", "server.py"]