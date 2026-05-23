# Aakar — orientation for Claude

> Read this file at the start of every session in this repo. It captures the
> repo's intent, architectural rules, and growth plan — the things that aren't
> obvious from any single file but are load-bearing across the whole codebase.

## What this repo is

**Aakar** is an educational, interactive visualizer for LLM architectures. The user pastes a HuggingFace model ID (e.g. `gpt2`), the backend introspects the model via the `transformers` library on the meta device (no weights downloaded), and the frontend renders the actual `nn.Module` tree as a clickable 2D diagram.

```
Level 1: root model      (LlamaForCausalLM → LlamaModel + lm_head)
Level 2: backbone        (embed_tokens, layers (ModuleList), norm, rotary_emb)
Level 3: one layer       (input_layernorm, self_attn, mlp, post_attention_layernorm)
Level 4: inside attention(q_proj, k_proj, v_proj, o_proj, rotary_emb)
```

Any architecture supported by stock `transformers` (Llama, Qwen, Mistral, GPT-2, Gemma, Mixtral, …) works automatically — no per-family backend code. Models requiring `trust_remote_code=True` are refused for safety.

## ⚠️ This is a study repo — designed to grow

**The single most important fact about this codebase:** it is *built to be extended over time as the user studies new LLM architecture concepts.*

When the user finishes studying **sparse attention** or **Mamba**, the underlying *backend* picks the architecture up automatically as soon as `pip install -U transformers` makes the class available. What the user typically adds in this repo is *visual polish* — custom block renderers, layouts, or detail panels for specific module classes (e.g. a fan-out diagram for `LlamaSdpaAttention`, a mini sparsity-pattern grid for a sliding-window attention class).

This shapes every design decision in this repo. When working here, your job is to **preserve and reinforce that extensibility on the frontend** while keeping the backend introspection thin and faithful to the `transformers` source.

## Stack

| Side       | Stack                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Backend    | Python 3.12 · FastAPI 0.115 · Pydantic v2 · transformers 4.46 · torch 2.5 (CPU) · accelerate · uv|
| Frontend   | Vite 6 · React 18 · TypeScript 5.7 · Tailwind 3 · `@xyflow/react` (React Flow v12) · Zustand 5   |
| Container  | Docker Compose for local dev (hot reload) · standalone multi-stage Dockerfiles for prod         |
| Package mgr| `uv` (backend) · `pnpm@9.15.0` (frontend)                                                        |

**All versions are pinned exactly** (no `^`, no `~`). Reproducibility matters more than always-latest. On Linux the CPU-only torch wheels are pinned via `[tool.uv.sources]` so Docker images stay slim.

## Repo layout

```
Aakar/
├── backend/                   # Python FastAPI service. Standalone-deployable.
│   ├── src/aakar_api/
│   │   ├── domain/            # Pure types. No I/O, no framework.
│   │   ├── application/       # Use-case orchestration (ArchitectureService) + Protocols.
│   │   ├── infrastructure/    # TransformersIntrospector + DiskSpecCache.
│   │   ├── api/               # FastAPI routes, DI, CORS, error handlers.
│   │   └── main.py            # Composition root.
│   ├── tests/                 # unit/ + integration/
│   ├── pyproject.toml         # Pinned deps via uv.
│   └── Dockerfile             # base → dev → prod multi-stage.
├── frontend/                  # React + Vite SPA. Standalone-deployable.
│   └── src/
│       ├── domain/            # Mirrored Spec/Node types + navigation helpers.
│       ├── application/       # Hooks: useArchitecture, useNavigation, useSelection.
│       ├── infrastructure/    # HttpArchitectureRepository + typed error hierarchy.
│       ├── store/             # Zustand container (state + setters, no logic).
│       ├── presentation/      # UI layer.
│       │   ├── canvas/        # React Flow host + custom edges.
│       │   ├── blocks/        # BlockRegistry + GenericBlockNode + register.ts.
│       │   ├── layout/        # LayoutRegistry + verticalStack + fanOut + register.ts.
│       │   ├── details/       # DetailRegistry + GenericDetailPanel + register.ts.
│       │   └── components/    # ModelInputBar, Breadcrumb, GenericViewBanner, ui/*.
│       └── styles/            # tokens.css + Tailwind base.
├── docs/                      # architecture, introspection, block-types, spec-contract.
├── docker-compose.yml         # Local dev orchestration (hot reload).
└── README.md
```

## Architectural rules (load-bearing)

### 1. Layered architecture, both sides

```
Domain          (pure types — no framework, no I/O)
  ↑
Application     (use cases — depends on Domain + abstract interfaces)
  ↑
Infrastructure  (concrete external integrations — implements Application's interfaces)
  ↑
Presentation / API   (UI components / HTTP routes — wires everything via DI)
```

**Dependency rule**: lower layers know nothing about higher ones. The application layer declares the abstractions it needs (`Introspector`, `SpecCache`, `ArchitectureRepository`); infrastructure provides the implementations; `main.py` / `App.tsx` is the composition root that wires concretes.

Never have `domain/` import from `application/` or anything above. Never have `application/` import from `infrastructure/` (only the Protocols it declares in `application/interfaces.py`). The introspector imports `transformers` and `torch`; nothing else does.

### 2. Patterns that earn their place

| Pattern         | Backend                                          | Frontend                                                |
| --------------- | ------------------------------------------------ | ------------------------------------------------------- |
| **Strategy**    | —                                                | `BlockNodeComponent`, `LayoutStrategy`, `DetailPanelComponent` |
| **Registry**    | —                                                | `BlockRegistry`, `LayoutRegistry`, `DetailRegistry`     |
| **Repository**  | `Introspector`, `SpecCache` (Protocols)          | `ArchitectureRepository` (interface)                    |
| **Service**     | `ArchitectureService`                            | `useArchitecture` hook                                  |
| **DI**          | `app.state` set in `lifespan`, `Depends()` resolver | Constructor injection + `useMemo` in hooks           |

These patterns are not ceremony — each enables a specific kind of extensibility:
- **Strategy + Registry (frontend)** → adding a custom renderer for a new module class is a new component file + one registration line.
- **Repository / Protocols** → tests inject fakes without mocking frameworks. `ArchitectureService` is tested with a fake introspector + cache; no transformers in the test path.
- **Service** → orchestration is testable without HTTP, FastAPI, or React.

**Do not "simplify" these away** on the frontend by replacing classes with bare functions or registries with `if/elif`.

### 3. Patterns we deliberately don't use

No DI container. No event bus. No CQRS. No DDD aggregates. The codebase is small; the patterns above pay for themselves; anything more would be ceremony.

## The Spec contract — the cross-app boundary

The `Spec` (and its recursive `Node`) is the only data structure crossing between backend and frontend. Defined in two places:

- **Source of truth**: [`backend/src/aakar_api/domain/spec.py`](backend/src/aakar_api/domain/spec.py) (Pydantic v2).
- **Hand-mirrored**: [`frontend/src/domain/spec.ts`](frontend/src/domain/spec.ts) (TS types).
- **Canonical doc**: [`docs/spec-contract.md`](docs/spec-contract.md).

**When the contract changes, all three update in the same commit.** The user explicitly chose this two-source manual sync over codegen tooling.

## How this repo grows — extension playbook

The whole point of this codebase.

### Adding support for a new architecture

**You usually do nothing.** As soon as a new model family is bundled in `transformers` (a `pip install -U transformers` away), the introspector handles it. Verify by submitting the model id in the UI; the Spec will reflect the real `nn.Module` tree.

If introspection chokes on something specific to a class (rare — usually a bug in transformers itself), file an upstream issue. We don't work around it here.

### Adding a custom renderer for a module class

The full guide: [`docs/block-types.md`](docs/block-types.md). Short version:

1. Write `frontend/src/presentation/blocks/LlamaSdpaAttentionNode.tsx`. Register with `blockRegistry.register("llama_sdpa_attention", LlamaSdpaAttentionNode)` in `register.ts`. Skip and `GenericBlockNode` handles it.
2. Optional: custom detail panel + `detailRegistry.register(...)`.
3. Optional: custom layout via `layoutRegistry.register("llama_sdpa_attention", strategy)`.

Each step is a **new file plus one registration line**. No edits to existing block components or registries. The registry key is `snake_case(module_class)`.

### The "study cadence" pattern

When the user studies a new concept (e.g. sparse attention, MoE routing):

1. Read the paper / source code.
2. Submit a model that uses it in the Aakar UI — the introspector already renders it correctly.
3. *Optionally* write a custom renderer that visualizes what's new (e.g., a sparsity-pattern mini-diagram inside the relevant module's card).
4. Optionally update `docs/spec-contract.md` and `docs/block-types.md` with the new module-class names if they're worth calling out.

The repo state after step 2 is already useful. Custom rendering is polish.

## Common commands

```bash
# Local dev — everything
docker compose up                              # API on :8000, web on :5173, hot reload

# Local dev — backend only
cd backend && uv sync
cd backend && uv run uvicorn aakar_api.main:app --reload

# Local dev — frontend only
cd frontend && pnpm install
cd frontend && pnpm dev

# Tests
cd backend && uv run pytest           # unit + integration (fast, offline)
cd backend && uv run pytest -m smoke  # smoke (hits live HF Hub) — run after dep bumps
cd frontend && pnpm test:run

# Type-check + build
cd frontend && pnpm typecheck
cd frontend && pnpm build

# Production images (each app standalone)
docker build --target prod -t aakar-api  ./backend
docker build --target prod --build-arg VITE_API_URL=https://api.example.com -t aakar-web ./frontend
```

## Conventions to follow when editing

- **Pin all dependency versions** exactly. No `^`, no `~`, no floating.
- **OOP, not scripts** *on the frontend*. The backend introspection layer is intentionally a small set of free functions + one introspector class — don't ceremoniously wrap it.
- **One file per concept.** New renderers, new layouts, new detail panels each get their own file.
- **Comments only where the WHY is non-obvious.** Don't restate what the code does.
- **Frozen domain objects.** `Spec` and `Node` are `frozen=True` Pydantic models / `Readonly<>` TS types. Treat them as immutable; build new instances, don't mutate.
- **No CSS `@import` after `@tailwind` directives.** PostCSS rejects this; put `@import` first.
- **React Flow `fitView` is initial-mount only.** When the view changes (level 1 → 2 → 3), pass a changing `key` prop so the canvas remounts and refits. See `Canvas.tsx`.
- **Selection state lives in our Zustand store, not in React Flow.** Don't read React Flow's `selected` prop in renderers — read `data.isSelected` (set by `Canvas.tsx`).

## Things to NOT do

- ❌ **Don't merge backend + frontend into a monorepo** (no `apps/api`, `apps/web`, no shared `packages/`). The user explicitly chose top-level `backend/` and `frontend/` because each deploys independently. The Spec is hand-mirrored on purpose.
- ❌ **Don't add codegen** for the Spec types (Pydantic → TS). Two hand-maintained files in the same commit is the chosen contract.
- ❌ **Don't enable `trust_remote_code=True`.** Aakar refuses to execute custom Python from arbitrary HF repos on the server. Models that require it should fail with a clear `unsupported_architecture` error.
- ❌ **Don't add response validation on the frontend.** Trust the backend's Pydantic-validated output; structural TS typing is sufficient.
- ❌ **Don't reintroduce per-family backend adapters.** The introspector is the only place that turns a model id into a `Spec`. If you want a richer view of *some* architecture, do it on the frontend with a custom renderer keyed by `module_class`.
- ❌ **Don't commit `node_modules/`, `.venv/`, `dist/`, `__pycache__/`, `backend/.cache/`** — `.gitignore` and `.dockerignore` already cover these.
- ❌ **Don't add features outside scope** without checking with the user first: no tokenizer view, no model card, no comparison view, no animation, no 3D, no dark mode, no share-by-URL, no auth.

## Where to look first

| Goal                                                    | Open this                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| Understand the overall design                           | [`docs/architecture.md`](docs/architecture.md)                   |
| Understand or modify the introspection flow             | [`docs/introspection.md`](docs/introspection.md)                 |
| Add a custom renderer / layout / detail for a module class | [`docs/block-types.md`](docs/block-types.md)                  |
| Look up the Spec JSON shape                             | [`docs/spec-contract.md`](docs/spec-contract.md)                 |
| Find the introspector                                   | [`backend/src/aakar_api/infrastructure/transformers_introspector.py`](backend/src/aakar_api/infrastructure/transformers_introspector.py) |
| Find the frontend Strategy registries                   | [`frontend/src/presentation/{blocks,layout,details}/`](frontend/src/presentation/) |
| Find the composition roots                              | [`backend/src/aakar_api/main.py`](backend/src/aakar_api/main.py) and [`frontend/src/main.tsx`](frontend/src/main.tsx) |
