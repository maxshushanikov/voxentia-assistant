# Multi-stage build — smaller runtime image (~450–600MB vs ~1.5–2.5GB)

FROM python:3.11-slim AS builder
WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY core /build/core
RUN pip install --no-cache-dir --prefix=/install -e /build/core

COPY backend/requirements.txt /build/requirements.txt
RUN pip install --no-cache-dir --prefix=/install -r /build/requirements.txt

FROM python:3.11-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY core/src /app/core/src
COPY core/pyproject.toml /app/core/pyproject.toml
COPY backend/app /app/backend/app
COPY backend/__init__.py /app/backend/__init__.py
COPY plugins /app/plugins

ENV PYTHONPATH=/app/core/src:/app:/app/backend
ENV DATA_DIR=/app/data

RUN mkdir -p /app/data/audio /app/data/chroma /app/data/uploads

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
