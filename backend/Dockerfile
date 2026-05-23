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

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_LINK_MODE=copy

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

EXPOSE 8000
CMD ["uvicorn", "aakar_api.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "2"]
