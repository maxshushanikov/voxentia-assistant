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

test:
	pytest tests/

docker-up:
	docker compose -f deployment/docker-compose.yml up --build

docker-down:
	docker compose -f deployment/docker-compose.yml down

docs:
	mkdocs serve
