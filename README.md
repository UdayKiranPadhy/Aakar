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

## License

Personal study project. No license set.
