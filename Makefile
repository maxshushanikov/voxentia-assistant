# Voxentia Makefile

.PHONY: help install test test-all lint typecheck docker-up docker-down docs

help:
	@echo "Verfügbare Befehle:"
	@echo "  make install     - Installiert alle Abhängigkeiten"
	@echo "  make test        - Führt Backend Unit-Tests aus"
	@echo "  make test-all    - Backend + Frontend Tests"
	@echo "  make lint        - ruff + eslint"
	@echo "  make typecheck   - mypy (backend) + tsc (frontend)"
	@echo "  make docker-up   - Startet den kompletten Stack via Docker"
	@echo "  make docker-down - Stoppt alle Container"
	@echo "  make docs        - MkDocs Entwicklungsserver"

install:
	pip install -e core
	pip install -r backend/requirements.txt
	pip install -r requirements-dev.txt
	cd frontend && npm install

test:
	pytest tests/ -v

test-all: test
	cd frontend && npm run test

lint:
	ruff check backend/app core/src/voxentia tests
	cd frontend && npm run lint

typecheck:
	mypy backend/app core/src/voxentia --ignore-missing-imports || true
	cd frontend && npx tsc -b --noEmit

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docs:
	mkdocs serve
