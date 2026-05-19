FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy core first (as it's a package)
COPY core /app/core
RUN pip install -e /app/core

# Copy requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application and plugins
COPY backend /app/backend
COPY plugins /app/plugins

# Set environment variables
ENV PYTHONPATH="/app/core/src:/app:/app/backend"

EXPOSE 8000

CMD ["python", "backend/app/main.py"]
