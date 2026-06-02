## Aakar — top-level dev commands.
##
## Run `make` (or `make help`) for the list.

.DEFAULT_GOAL := help
SHELL := /bin/bash

BACKEND  := backend
FRONTEND := frontend
COMPOSE  := docker compose

# ─────────────────────────────────────────────────────────────────────────────
# Help
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: help
help:  ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z][a-zA-Z0-9_-]*:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ─────────────────────────────────────────────────────────────────────────────
# Install
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: install install-backend install-frontend
install: install-backend install-frontend  ## Install backend (uv) + frontend (pnpm) deps

install-backend:  ## uv sync in backend/
	cd $(BACKEND) && uv sync

install-frontend:  ## pnpm install in frontend/
	cd $(FRONTEND) && pnpm install

# ─────────────────────────────────────────────────────────────────────────────
# Local dev (no Docker)
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: local-dev backend-dev frontend-dev preflight kill-ports
preflight:  ## Verify install state before local-dev (silent on success)
	@if [ ! -d $(BACKEND)/.venv ]; then \
		echo "✗ $(BACKEND)/.venv missing — run 'make install-backend'"; exit 1; fi
	@if [ ! -d $(FRONTEND)/node_modules ]; then \
		echo "✗ $(FRONTEND)/node_modules missing — run 'make install-frontend'"; exit 1; fi

kill-ports:  ## Free :8000 and :5173 — terminate then kill -9 if needed
	@for port in 8000 5173; do \
		pids=$$(lsof -ti :$$port 2>/dev/null); \
		if [ -n "$$pids" ]; then \
			echo "→ freeing :$$port (pids: $$pids)"; \
			kill $$pids 2>/dev/null || true; \
			for i in 1 2 3 4 5; do \
				sleep 0.4; \
				pids=$$(lsof -ti :$$port 2>/dev/null) || true; \
				[ -z "$$pids" ] && break; \
			done; \
			pids=$$(lsof -ti :$$port 2>/dev/null) || true; \
			if [ -n "$$pids" ]; then \
				echo "  forcing SIGKILL on $$pids"; \
				kill -9 $$pids 2>/dev/null || true; \
				sleep 0.5; \
			fi; \
		fi; \
	done

local-dev: preflight kill-ports  ## Run backend (:8000) + frontend (:5173) locally with hot reload
	@trap 'kill 0' INT TERM EXIT; \
	$(MAKE) -j 2 backend-dev frontend-dev

backend-dev:  ## Run just the backend (uvicorn --reload on :8000)
	cd $(BACKEND) && AAKAR_ALLOW_REMOTE_CODE=1 uv run uvicorn aakar_api.main:app --reload

frontend-dev:  ## Run just the frontend (vite on :5173)
	cd $(FRONTEND) && pnpm dev

# ─────────────────────────────────────────────────────────────────────────────
# Docker dev
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: docker-dev docker-up docker-down docker-logs docker-build docker-rebuild
docker-dev: docker-up  ## Alias for docker-up

docker-up:  ## docker compose up --build (foreground)
	$(COMPOSE) up --build

docker-down:  ## docker compose down (stop + remove containers + network)
	$(COMPOSE) down

docker-logs:  ## Tail compose logs
	$(COMPOSE) logs -f

docker-build:  ## Build the prod images for both services
	docker build --target prod -t aakar-api $(BACKEND)
	docker build --target prod -t aakar-web $(FRONTEND)

docker-rebuild:  ## Force a clean rebuild of the dev compose stack
	$(COMPOSE) build --no-cache
	$(COMPOSE) up

# ─────────────────────────────────────────────────────────────────────────────
# Tests, lint, typecheck
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: test test-backend test-frontend smoke lint typecheck check
test: test-backend test-frontend  ## Run all (fast, offline) tests

test-backend:  ## pytest in backend/ (skips smoke by default)
	cd $(BACKEND) && uv run pytest

test-frontend:  ## vitest in frontend/ (one-shot)
	cd $(FRONTEND) && pnpm test:run

smoke:  ## End-to-end smoke tests — hits live HF Hub, run after dep bumps
	cd $(BACKEND) && uv run pytest -m smoke -v

lint:  ## ruff + mypy (backend) + tsc (frontend)
	cd $(BACKEND) && uv run ruff check
	cd $(BACKEND) && uv run mypy
	cd $(FRONTEND) && pnpm typecheck

typecheck:  ## Type-check only (mypy + tsc)
	cd $(BACKEND) && uv run mypy
	cd $(FRONTEND) && pnpm typecheck

check: lint test  ## Full pre-commit check: lint + tests

# ─────────────────────────────────────────────────────────────────────────────
# Cleanup
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: clean clean-cache clean-backend clean-frontend prune-all
clean: clean-backend clean-frontend  ## Remove build artifacts + caches (keeps .venv / node_modules)

clean-cache:  ## Empty the introspector's disk spec cache (backend/.cache/specs/)
	rm -rf $(BACKEND)/.cache

clean-backend:  ## Remove backend build/test artifacts (NOT .venv)
	rm -rf $(BACKEND)/.cache
	rm -rf $(BACKEND)/.pytest_cache
	rm -rf $(BACKEND)/.ruff_cache
	rm -rf $(BACKEND)/.mypy_cache
	find $(BACKEND) -type d -name __pycache__ -prune -exec rm -rf {} +

clean-frontend:  ## Remove frontend build artifacts (NOT node_modules)
	rm -rf $(FRONTEND)/dist
	rm -rf $(FRONTEND)/.vite
	rm -rf $(FRONTEND)/node_modules/.tmp
	find $(FRONTEND) -name '*.tsbuildinfo' -delete

prune-all: clean  ## Nuke everything — .venv, node_modules, compose containers/volumes/images
	rm -rf $(BACKEND)/.venv
	rm -rf $(FRONTEND)/node_modules
	-$(COMPOSE) down --rmi local --volumes --remove-orphans
