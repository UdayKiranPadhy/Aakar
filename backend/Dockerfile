# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for the Aakar API.
#
#   docker build --target dev  -t aakar-api:dev  .
#   docker build --target prod -t aakar-api:prod .
#
# The `dev` target expects /app/src to be bind-mounted by docker-compose.
# The `prod` target bakes the source into the image and runs uvicorn with
# multiple workers.

###################################################################
# 1. base — Python + uv + dependencies (no project source yet)
###################################################################
FROM python:3.12-slim AS base

# PYTHONUNBUFFERED stays on (real-time logs, not a latency cost). UV_COMPILE_BYTECODE
# makes `uv sync` precompile the venv's .pyc at *build* time — torch/transformers are
# thousands of modules, so compiling them once here shaves seconds off every cold
# import. PYTHONDONTWRITEBYTECODE stays on too: it only blocks *writing* new .pyc at
# runtime (avoids __pycache__ churn in the bind-mounted dev source), never reading the
# ones baked in below.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

WORKDIR /app

# Install uv (the dependency manager + venv tool).
RUN pip install --no-cache-dir uv==0.8.11

# Install dependencies only — the project itself is not installed here so
# that source code mounted at /app/src (dev) or COPY'd (prod) is picked up
# via PYTHONPATH without needing a wheel rebuild.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app/src"

###################################################################
# 2. dev — relies on bind-mounted source for hot reload
###################################################################
FROM base AS dev

EXPOSE 8000
CMD ["uvicorn", "aakar_api.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--reload", "--reload-dir", "/app/src"]

###################################################################
# 3. prod — source baked in, multiple workers, no reload
###################################################################
FROM base AS prod

COPY src ./src
# Precompile the app's own bytecode too (compileall writes .pyc explicitly, regardless
# of PYTHONDONTWRITEBYTECODE), so the first request after a cold start imports from .pyc.
RUN python -m compileall -q src

EXPOSE 8000
# A single worker on purpose: torch/transformers is imported (and a meta model built)
# per worker, so N workers means N× the import time and memory on a cold start — the
# big-model meta builds were the likely trigger for OOM-driven instance churn. Let
# Cloud Run scale *containers* horizontally (set a low per-instance concurrency) instead
# of forking workers inside one small instance.
CMD ["uvicorn", "aakar_api.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "1"]
