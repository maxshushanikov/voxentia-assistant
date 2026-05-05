FROM python:3.11-slim

WORKDIR /app

# Abhängigkeiten installieren
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend-Code (inklusive api und core Unterordner)
COPY backend/ /app/backend/

# Frontend und Assets aus dem Root-Verzeichnis
COPY frontend/ /app/frontend/
COPY assets/ /app/assets/

EXPOSE 8000

CMD ["python", "backend/main.py"]