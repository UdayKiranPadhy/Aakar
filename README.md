# Aakar

> *Aakar* (आकार) — Sanskrit for "shape" or "form."

**An interactive visualizer and learning companion for LLM architectures.**
Paste a HuggingFace model ID and Aakar introspects the model with `transformers`
on the **meta device** (no weights downloaded) and renders its real `nn.Module`
tree as a clickable 2D diagram — then layers on parameter, compute, config and
research views, a side-by-side model comparison, and a self-contained "Learn"
knowledge base on the history and ideas behind modern AI.

🔗 **Live:** [aakar.udaykp.dev](https://aakar.udaykp.dev/)

Any architecture supported by stock `transformers` (Llama, Qwen, Mistral, GPT-2,
Gemma, Mixtral, …) works automatically — there is **no per-family backend code**.
This is a **study repo**, built to grow as its author studies new architecture
concepts; see [docs/block-types.md](docs/block-types.md).

## What's inside (four surfaces)

| Surface | What it does |
| --- | --- |
| **Home** | Landing page — search the Hub, pick a trending model, jump into Learn. |
| **Model** | A loaded model's dashboard: the React Flow **architecture** diagram (three zoom levels), plus **overview, token journey, config, parameters, compute** and **research** (the papers/source a model cites). |
| **Compare** | Two models side by side — architecture, parameters, compute, tokenizers, files and research. |
| **Learn** | A backend-free knowledge base: **AI Timeline, Concepts, Architecture Evolution, Research Papers, Blogs, Benchmarks, Glossary.** All statically authored — see [authoring guide](frontend/src/presentation/learn/content/README.md). |

The architecture diagram zooms through the real module tree:

```
Level 1: root model      (LlamaForCausalLM → LlamaModel + lm_head)
Level 2: backbone        (embed_tokens, layers (ModuleList), norm, rotary_emb)
Level 3: one layer       (input_layernorm, self_attn, mlp, post_attention_layernorm)
Level 4: inside attention(q_proj, k_proj, v_proj, o_proj, rotary_emb)
```

## Stack

- **Backend** — Python 3.12 · FastAPI · Pydantic v2 · `transformers` + `torch` (CPU, meta device) · `httpx` · `uv`. Optional Redis for a shared spec cache.
- **Frontend** — Vite 6 · React 18 · TypeScript 5.7 · CSS Modules + `tokens.css` · [`@xyflow/react`](https://reactflow.dev) (React Flow v12) · Zustand 5 · framer-motion (landing only) · `pnpm`.
- **Containers** — Docker Compose for local dev (hot reload); standalone multi-stage Dockerfiles (`prod` target) for independent deployment of each service.

All dependency versions are **pinned exactly** (no `^`, no `~`) — reproducibility over always-latest.

## Repository layout

```
Aakar/
├── backend/          # FastAPI service. Standalone-deployable.
├── frontend/         # React + Vite SPA. Standalone-deployable.
├── docs/             # architecture, introspection, block-types, spec-contract
└── docker-compose.yml
```

Backend and frontend are **separate top-level apps**, not a monorepo — each
deploys independently. The `Spec` JSON contract between them is hand-mirrored in
`backend/.../domain/spec.py` and `frontend/src/domain/spec.ts` (see
[docs/spec-contract.md](docs/spec-contract.md)).

## Quickstart (local dev, Docker)

```bash
docker compose up --build
```

- API → http://localhost:8000 (Swagger UI at `/docs`)
- Web → http://localhost:5173

Both services run with hot reload (`uvicorn --reload` and Vite HMR) via
bind-mounted source.

## Quickstart (local dev, no Docker)

```bash
# Backend
cd backend
uv sync
uv run uvicorn aakar_api.main:app --reload

# Frontend (separate shell — needs Node ≥ 18)
cd frontend
pnpm install
pnpm dev
```

## Try it

In the model input bar:

- `mistralai/Mistral-7B-v0.1`
- `Qwen/Qwen2.5-7B`
- `gpt2`

## Architecture in 60 seconds

```
Browser ─(model_id)─▶ FastAPI ─▶ ArchitectureService
                                       │
                                       ├─▶ ConfigLoader  ─▶ HF Hub (config.json)
                                       └─▶ TransformersIntrospector
                                              build on meta device (no weights)
                                              → walk nn.Module tree → Spec (JSON)
                                                              │
Browser ◀───────────────────────────────────────────────────┘
   │
   ▼
React Flow canvas — three Strategy registries (Block, Layout, Detail) drive rendering.
```

A second `/operations` call lazily runs a fake-tensor trace to annotate each
module's forward-pass ops; further endpoints serve Hub metadata, the papers a
model cites, its source code and trending models. Full design:
[docs/architecture.md](docs/architecture.md) ·
[docs/introspection.md](docs/introspection.md).

## Extending Aakar

- **Add a new architecture** — usually **nothing to do**: as soon as a family
  ships in `transformers` (`pip install -U transformers`), the introspector
  renders it. Custom visual polish for a module class is a new file + one
  registration line: [docs/block-types.md](docs/block-types.md).
- **Add Learn content** (a research paper, blog, timeline milestone, architecture
  era, concept) — append one object to a data file:
  [Learn content authoring guide](frontend/src/presentation/learn/content/README.md).
- **Spec contract** — [docs/spec-contract.md](docs/spec-contract.md).

## Production deployment

Backend and frontend are deployed independently. Each has its own multi-stage
Dockerfile with a `prod` target.

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
