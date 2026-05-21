#!/bin/sh
set -e

export PYTHONPATH="/app/core/src:/app/backend:/app${PYTHONPATH:+:$PYTHONPATH}"
cd /app

exec uvicorn serve:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${UVICORN_WORKERS:-2}" \
  --loop uvloop \
  --http httptools \
  "$@"
