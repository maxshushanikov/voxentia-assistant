# Voxentia Makefile

.PHONY: help install test docker-up docker-down docs

help:
	@echo "Verfügbare Befehle:"
	@echo "  make install    - Installiert alle Abhängigkeiten"
	@echo "  make test       - Führt Unit-Tests aus"
	@echo "  make docker-up  - Startet den kompletten Stack via Docker"
	@echo "  make docker-down- Stoppt alle Container"
	@echo "  make docs       - Startet den MkDocs Entwicklungsserver"

install:
	pip install -e core
	pip install -r backend/requirements.txt
	pip install -r requirements-dev.txt
	cd frontend && npm install

test:
	pytest tests/ -v

lint:
	ruff check backend/app core/src/voxentia tests
	cd frontend && npm run lint

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docs:
	mkdocs serve
