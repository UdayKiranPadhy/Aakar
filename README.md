# Aakar

> *Aakar* (आकार) — Sanskrit for "shape" or "form."

An interactive visualizer for LLM architectures. Paste a HuggingFace model ID and Aakar renders the model's architecture as a clickable 2D diagram with three zoom levels — overview, inside a decoder block, inside attention.

This is a **study repo**: the architecture is designed so that adding a new block type (e.g., sparse attention, Mixture-of-Experts, Mamba SSM) is a tightly-localized change. See [docs/block-types.md](docs/block-types.md) and [docs/adapters.md](docs/adapters.md).

## v0.1 scope

- Llama family: `llama`, `mistral`, `qwen2`, `qwen3`.
- Generic fallback for any other `model_type`.
- Three zoom levels: full model → inside a decoder block → inside self-attention.
- No auth, no DB, no analytics.

## Stack

- **Backend**: Python 3.12 · FastAPI · Pydantic v2 · httpx · uv
- **Frontend**: Vite · React 18 · TypeScript · Tailwind 3 · `@xyflow/react` · Zustand · pnpm
- **Containerization**: Docker Compose for local dev; standalone multi-stage Dockerfiles for production deployment of each service.

## Repository layout

```
Aakar/
├── backend/          # FastAPI service. Standalone-deployable.
├── frontend/         # React + Vite SPA. Standalone-deployable.
├── docs/             # Architecture, adapter guide, block-type guide, spec contract.
└── docker-compose.yml
```

## Quickstart (local dev, Docker)

```bash
docker compose up --build
```

- API → http://localhost:8000 (Swagger UI at `/docs`)
- Web → http://localhost:5173

Both services run with hot reload (`uvicorn --reload` and Vite HMR) via bind-mounted source.

## Quickstart (local dev, no Docker)

```bash
# Backend
cd backend
uv sync
uv run uvicorn aakar_api.main:app --reload

# Frontend (separate shell)
cd frontend
pnpm install
pnpm dev
```

## Try it

In the model input bar:

- `mistralai/Mistral-7B-v0.1`
- `Qwen/Qwen2.5-7B`
- `gpt2` (renders via the generic fallback adapter)

## Architecture in 60 seconds

```
Browser ─(model_id)─▶ FastAPI ─▶ ArchitectureService
                                       │
                                       ├─▶ ConfigRepository ─▶ HF Hub
                                       └─▶ AdapterRegistry  ─▶ LlamaFamilyAdapter
                                                                    │
                                                                    ▼
                                                                  Spec (JSON)
                                                                    │
Browser ◀───────────────────────────────────────────────────────────┘
   │
   ▼
React Flow canvas — three Strategy registries (Block, Layout, Detail) drive rendering.
```

Full design: [docs/architecture.md](docs/architecture.md).

## Extending Aakar

- **Add a new architecture** (e.g., Mixtral, GPT-OSS): [docs/adapters.md](docs/adapters.md)
- **Add a new block type + renderer** (e.g., sparse attention, MoE router): [docs/block-types.md](docs/block-types.md)
- **Spec contract**: [docs/spec-contract.md](docs/spec-contract.md)

## Production deployment

Backend and frontend are deployed independently. Each has its own multi-stage Dockerfile with a `prod` target.

```bash
docker build --target prod -t aakar-api  ./backend
docker build --target prod --build-arg VITE_API_URL=https://api.example.com -t aakar-web ./frontend
```

### Cloud Run runtime config (latency-critical)

The backend imports `torch` + `transformers` and builds a model on the meta device on every
cold start, so the *runtime* settings matter as much as the image:

```bash
gcloud run deploy aakar-api \
  --image <registry>/aakar-api \
  --min-instances 1 \     # keep one warm: removes the ~25s cold-start import on the common path
  --cpu-boost \           # extra CPU during startup, so the torch import finishes faster when a cold start does happen
  --concurrency 4 \       # the image runs ONE uvicorn worker (CPU-bound introspection); scale containers, not in-process workers
  --cpu 2 --memory 2Gi \  # headroom for a large meta build; a single worker keeps memory bounded
  --set-env-vars HF_TOKEN=<read-token>,REDIS_URL=<rediss://…>
```

- `HF_TOKEN` — without it the Hub warns about unauthenticated requests (lower rate limits, slower config fetches). A read-only token is enough; it's never logged or used as a cache key.
- `REDIS_URL` — enables the shared, persistent spec-cache tier (`rediss://` for TLS, e.g. Upstash) so one instance's cold build warms every instance and survives redeploys. Optional; omit for disk-only.
- The prod image runs `uvicorn --workers 1` on purpose (see `backend/Dockerfile`): `torch` is imported and a model built per worker, so N workers means N× the cold-start import + memory. Scale out with `--min/--max-instances` and a low `--concurrency` instead.

## License

Personal study project. No license set.
