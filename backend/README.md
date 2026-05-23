# Aakar API

FastAPI service that turns a HuggingFace model ID into a composition Spec (JSON architecture diagram).

## Layered architecture

```
api/             ← FastAPI routes, DI wiring, CORS, error handlers
application/     ← Use-case orchestration (ArchitectureService)
infrastructure/  ← External integrations (HF Hub via httpx)
adapters/        ← Strategy implementations (per model family) + BlockBuilder + param formulas
domain/          ← Pure types: Spec, Node, ModelConfig, exceptions
```

Lower layers know nothing about higher layers. `main.py` is the composition root.

## Local dev (without Docker)

```bash
uv sync
uv run uvicorn aakar_api.main:app --reload
```

API at http://localhost:8000. Swagger UI at `/docs`.

## Run tests

```bash
uv run pytest
```

## Docker

Built from the repo root via `docker compose up backend`. For production:

```bash
docker build --target prod -t aakar-api .
```

## Extending

- New architecture (e.g., Mixtral): see `../docs/adapters.md`
- New block type (e.g., sparse_attention): see `../docs/block-types.md`
