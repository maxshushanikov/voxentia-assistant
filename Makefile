# Voxentia Makefile
# Professional Build Process with automatic dependency management

.PHONY: help install test test-all lint typecheck docker-up docker-down docs migrate build frontend backend \
        check-prerequisites frontend-check frontend-build

# ============================================================================
# COLORS & HELPERS
# ============================================================================
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

# ============================================================================
# CHECKS & PREREQUISITES
# ============================================================================

check-prerequisites:
	@echo "$(CYAN)🔍 Checking prerequisites...$(NC)"
	@command -v docker >/dev/null 2>&1 || (echo "$(RED)❌ Docker not found!$(NC)"; exit 1)
	@echo "$(GREEN)✓ Docker available$(NC)"
	@command -v npm >/dev/null 2>&1 || (echo "$(RED)❌ npm not found!$(NC)"; exit 1)
	@echo "$(GREEN)✓ npm available$(NC)"

frontend-check:
	@if [ ! -d "frontend/node_modules" ]; then \
		echo "$(YELLOW)❌ node_modules not found!$(NC)"; \
		echo "$(CYAN)📦 Installing npm dependencies...$(NC)"; \
		cd frontend && npm ci --prefer-offline --no-audit && cd ..; \
		echo "$(GREEN)✓ npm install successful$(NC)"; \
	else \
		echo "$(GREEN)✓ node_modules available$(NC)"; \
	fi

frontend-build: frontend-check
	@echo "$(CYAN)🏗️  Building frontend...$(NC)"
	@cd frontend && npm run build > /dev/null 2>&1; \
	BUILD_STATUS=$$?; \
	if [ $$BUILD_STATUS -ne 0 ]; then \
		echo "$(YELLOW)⚠️  Build failed, cleaning up...$(NC)"; \
		rm -rf node_modules; \
		echo "$(CYAN)📦 Reinstalling npm dependencies...$(NC)"; \
		npm ci --legacy-peer-deps --no-audit --no-fund > /dev/null 2>&1; \
		echo "$(CYAN)🔄 Retrying build...$(NC)"; \
		npm run build > /dev/null 2>&1; \
		if [ $$? -ne 0 ]; then \
			cd .. && echo "$(RED)❌ Frontend build failed$(NC)" && exit 1; \
		fi; \
	fi; \
	cd .. && echo "$(GREEN)✓ Frontend build successful$(NC)"

# ============================================================================
# MAIN TARGETS
# ============================================================================

help:
	@echo ""
	@echo "$(CYAN)=== VOXENTIA - Professional Build System ===$(NC)"
	@echo ""
	@echo "$(YELLOW)Setup & Installation:$(NC)"
	@echo "  $(CYAN)make install$(NC)         - Install all dependencies (Python + Frontend)"
	@echo ""
	@echo "$(YELLOW)Building & Compilation:$(NC)"
	@echo "  $(CYAN)make build$(NC)           - Build frontend (standalone)"
	@echo "  $(CYAN)make docker-up$(NC)       - Start Docker stack (auto frontend setup)"
	@echo "  $(CYAN)make docker-down$(NC)     - Stop all containers"
	@echo ""
	@echo "$(YELLOW)Local Development:$(NC)"
	@echo "  $(CYAN)make frontend$(NC)        - Start frontend dev server (auto setup)"
	@echo "  $(CYAN)make backend$(NC)         - Start backend server locally"
	@echo ""
	@echo "$(YELLOW)Testing & Quality:$(NC)"
	@echo "  $(CYAN)make test$(NC)            - Run backend unit tests"
	@echo "  $(CYAN)make test-all$(NC)        - Backend + Frontend tests"
	@echo "  $(CYAN)make lint$(NC)            - Run linters (ruff + eslint)"
	@echo "  $(CYAN)make typecheck$(NC)       - Type checking (mypy + tsc)"
	@echo ""
	@echo "$(YELLOW)Database & Documentation:$(NC)"
	@echo "  $(CYAN)make migrate$(NC)         - Run Alembic migrations"
	@echo "  $(CYAN)make docs$(NC)            - Start MkDocs dev server (http://localhost:8000)"
	@echo ""

install: check-prerequisites
	@echo "$(CYAN)--- Installing Dependencies ---$(NC)"
	@echo "$(CYAN)📥 Installing Python packages...$(NC)"
	pip install -e core
	pip install -r backend/requirements.txt
	pip install -r requirements-dev.txt
	@echo "$(GREEN)✓ Python dependencies installed$(NC)"
	@echo "$(CYAN)📥 Installing Frontend packages...$(NC)"
	cd frontend && npm ci --prefer-offline --no-audit && cd ..
	@echo "$(GREEN)✓ Frontend dependencies installed$(NC)"
	@echo "$(GREEN)✓ Installation complete!$(NC)"

build: frontend-build
	@echo ""

docker-up: check-prerequisites frontend-check frontend-build
	@echo ""
	@echo "$(CYAN)🚀 Starting Docker Stack...$(NC)"
	docker compose up --build

docker-down:
	@echo "$(CYAN)--- Stopping Docker Stack ---$(NC)"
	docker compose down
	@echo "$(GREEN)✓ Stopped$(NC)"

frontend: check-prerequisites frontend-check
	@echo ""
	@echo "$(CYAN)💻 Starting Frontend Dev Server (http://localhost:5173)...$(NC)"
	cd frontend && npm run dev

backend: check-prerequisites
	@echo "$(CYAN)--- Starting Backend Locally ---$(NC)"
	@export PYTHONPATH=core/src:backend:plugins/job_assistant/src:plugins/teacher_assistant/src:plugins/calendar/src && \
	python backend/app/main.py

test: check-prerequisites
	@echo "$(CYAN)--- Running Backend Tests ---$(NC)"
	pytest tests/ -v

test-all: check-prerequisites frontend-check test
	@echo "$(CYAN)--- Running Frontend Tests ---$(NC)"
	cd frontend && npm run test

lint: check-prerequisites frontend-check
	@echo "$(CYAN)--- Code Quality Checks ---$(NC)"
	@echo "$(CYAN)📝 Backend linting...$(NC)"
	ruff check backend/app core/src/voxentia tests || true
	@echo "$(GREEN)✓ Backend linting done$(NC)"
	@echo "$(CYAN)📝 Frontend linting...$(NC)"
	cd frontend && npm run lint && cd ..
	@echo "$(GREEN)✓ Frontend linting done$(NC)"

typecheck: check-prerequisites frontend-check
	@echo "$(CYAN)--- Type Checking ---$(NC)"
	@echo "$(CYAN)🔍 Backend type checking...$(NC)"
	mypy backend/app core/src/voxentia --ignore-missing-imports || true
	@echo "$(GREEN)✓ Backend type checking done$(NC)"
	@echo "$(CYAN)🔍 Frontend type checking...$(NC)"
	cd frontend && npx tsc -b --noEmit && cd ..
	@echo "$(GREEN)✓ Frontend type checking done$(NC)"

migrate:
	@echo "$(CYAN)--- Running DB Migrations ---$(NC)"
	cd backend && alembic upgrade head && cd ..
	@echo "$(GREEN)✓ Migrations completed$(NC)"

docs:
	@echo "$(CYAN)--- Starting Documentation (http://localhost:8000) ---$(NC)"
	mkdocs serve
