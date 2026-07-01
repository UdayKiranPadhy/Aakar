# Aakar API

FastAPI service that turns a HuggingFace model ID into a composition `Spec`
(a JSON architecture tree the frontend renders), plus the model metadata,
forward-pass operations, and research/source context around it.

It introspects models with `transformers` on the **meta device** — the module
tree is built with **no weights downloaded** — so there is no per-architecture
code: any family stock `transformers` supports works automatically.

## Layered architecture

```
api/             ← FastAPI routes, CORS, error handlers
di.py + main.py  ← DI wiring + composition root
application/     ← Use-case services: Architecture, Operations, Hub, Paper, Repo, Source
                  (+ interfaces.py — the Protocols infrastructure implements)
infrastructure/  ← introspection/ pipeline, HF Hub / GitHub / arXiv clients, caches
domain/          ← Pure types: Spec & Node, Hub & Research models, exceptions
```

Lower layers know nothing about higher ones. The application layer declares the
abstractions it needs (`Introspector`, `SpecCache`, …) in `interfaces.py`;
`infrastructure/` provides the implementations; `main.py` wires the concretes.

### Introspection pipeline (`infrastructure/introspection/`)

```
ConfigLoader        fetch config.json from the HF Hub
   → ModelBuilder   instantiate the model on the meta device (no weights)
   → NodeWalker     walk the live nn.Module tree
   → SpecBuilder    → Spec (JSON)
```

`/operations` additionally runs an `fx` fake-tensor trace to annotate each
module's forward-pass ops. The introspector is wrapped for resilience
(`lazy_`, `fallback_`, `sandboxed_introspector`) and results flow through a
tiered cache (in-memory → disk → optional Redis).

## API

All routes are under `/api` (Swagger UI at `/docs`):

| Method · Path | Purpose |
| --- | --- |
| `GET /health` | Liveness. |
| `GET /architecture?model_id=` | The module-tree `Spec`. |
| `GET /operations?model_id=` | The same tree + per-module forward-pass ops (lazy, expensive trace). |
| `GET /models?sort=&limit=` | Trending / popular Hub models. |
| `GET /model-info?model_id=` | Hub card metadata. |
| `GET /model-readme?model_id=` | The model's README markdown. |
| `GET /papers?model_id=` | arXiv papers a model cites (from its `arxiv:` Hub tags). |
| `GET /paper?arxiv_id=` | A single arXiv paper by id. |
| `GET /repo?model_id=` | The model's linked GitHub repo (best-effort). |
| `GET /source?url=` | The source slice behind a module's `source_url` (SSRF-allowlisted). |

Gated models: pass a read token via the `X-HF-Token` request header.

## Local dev (without Docker)

```bash
uv sync
uv run uvicorn aakar_api.main:app --reload
```

API at http://localhost:8000. Swagger UI at `/docs`.

## Run tests

```bash
uv run pytest           # unit + integration (fast, offline)
uv run pytest -m smoke  # smoke tests that hit the live HF Hub — run after dep bumps
```

## Docker

Built from the repo root via `docker compose up backend`. For production:

```bash
docker build --target prod -t aakar-api .
```

See the repo root [README](../README.md#cloud-run-runtime-config-latency-critical)
for Cloud Run runtime flags (the `torch`/`transformers` cold start makes them
matter), and `HF_TOKEN` / `REDIS_URL` configuration.

## Extending

- **New architecture** — usually nothing: the introspector handles any family
  `transformers` supports as soon as it's installed.
- **Spec shape** — [`../docs/spec-contract.md`](../docs/spec-contract.md)
  (the hand-mirrored backend ⇄ frontend contract).
- **How introspection works** — [`../docs/introspection.md`](../docs/introspection.md).
