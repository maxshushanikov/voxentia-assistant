# Multi-stage build — smaller runtime image (~450–600MB vs ~1.5–2.5GB)

FROM python:3.11-slim AS builder
WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY core /build/core
RUN pip install --default-timeout=1000 --no-cache-dir --prefix=/install -e /build/core

COPY backend/requirements.txt /build/requirements.txt
RUN pip install --default-timeout=1000 --no-cache-dir --prefix=/install -r /build/requirements.txt

FROM python:3.11-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY core/src /app/core/src
COPY core/pyproject.toml /app/core/pyproject.toml
COPY backend /app/backend
COPY plugins /app/plugins
COPY deployment/docker/serve.py /app/serve.py
COPY deployment/docker/backend-entrypoint.sh /entrypoint.sh

ENV PYTHONPATH=/app/core/src:/app/backend:/app
ENV DATA_DIR=/app/data

# .pth keeps `app` importable in all Uvicorn worker subprocesses (no pip install / PyPI at runtime)
RUN mkdir -p /app/data/audio /app/data/chroma /app/data/uploads \
    && chmod +x /entrypoint.sh \
    && printf '/app/core/src\n/app/backend\n' > /usr/local/lib/python3.11/site-packages/voxentia_paths.pth

WORKDIR /app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
