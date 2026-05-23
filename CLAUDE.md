# Aakar — orientation for Claude

> Read this file at the start of every session in this repo. It captures the
> repo's intent, architectural rules, and growth plan — the things that aren't
> obvious from any single file but are load-bearing across the whole codebase.

## What this repo is

**Aakar** is an educational, interactive visualizer for LLM architectures. The user pastes a HuggingFace model ID (e.g. `meta-llama/Llama-3-8B`), the backend fetches `config.json` from the Hub, and the frontend renders the architecture as a clickable 2D diagram with three zoom levels:

```
Level 1: full model     (embedding → 32 decoder blocks → final norm → lm_head)
Level 2: inside a block (RMSNorm → self-attention → +residual → RMSNorm → FFN → +residual)
Level 3: inside attention (Q, K, V fan-in → SDPA → O)
```

v0.1 ships the **Llama family** (`llama` / `mistral` / `qwen2` / `qwen3`) plus a generic fallback. No auth, no DB, no analytics.

## ⚠️ This is a study repo — designed to grow

**The single most important fact about this codebase:** it is *built to be extended over time as the user studies new LLM architecture concepts.*

When the user finishes reading about **sparse attention**, they will come back and add a `sparse_attention` block type. When they learn **Mixture-of-Experts**, they will add a `MixtralAdapter`. When they study **Mamba / SSMs**, they will add a `MambaAdapter` and new block types for the state-space operators. The repo is designed so that each of these is a **new file plus one registration line** — zero edits to existing classes (Open/Closed Principle).

This shapes every design decision in this repo. When working here, your job is to **preserve and reinforce that extensibility**, not to "simplify" the architecture by collapsing the patterns it relies on.

## Stack

| Side       | Stack                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Backend    | Python 3.12 · FastAPI 0.115 · Pydantic v2 · httpx · uv (managed deps)                            |
| Frontend   | Vite 6 · React 18 · TypeScript 5.7 · Tailwind 3 · `@xyflow/react` (React Flow v12) · Zustand 5   |
| Container  | Docker Compose for local dev (hot reload) · standalone multi-stage Dockerfiles for prod         |
| Package mgr| `uv` (backend) · `pnpm@9.15.0` (frontend)                                                        |

**All versions are pinned exactly** (no `^`, no `~`). Reproducibility matters more than always-latest.

## Repo layout

```
Aakar/
├── backend/                   # Python FastAPI service. Standalone-deployable.
│   ├── src/aakar_api/
│   │   ├── domain/            # Pure types. No I/O, no framework.
│   │   ├── application/       # Use-case orchestration (ArchitectureService).
│   │   ├── infrastructure/    # External integrations (HFConfigRepository).
│   │   ├── adapters/          # Strategy: one class per model family + Registry + Builder.
│   │   │   └── building/      # Cross-cutting helpers (BlockBuilder, param formulas).
│   │   ├── api/               # FastAPI routes, DI (Depends()), CORS, error handlers.
│   │   └── main.py            # Composition root.
│   ├── tests/                 # unit/ + integration/ + checked-in HF config fixtures.
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
├── docs/                      # Architecture, adapter guide, block-type guide, spec contract.
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

**Dependency rule**: lower layers know nothing about higher ones. The application layer declares the abstractions it needs (`ConfigRepository`, `ArchitectureRepository`); infrastructure provides the implementations; `main.py` / `App.tsx` is the composition root that wires concretes.

Never have `domain/` import from `application/` or anything above. Never have `application/` import from `infrastructure/` (only the abstractions it declares in `application/interfaces.*`).

### 2. Patterns that earn their place

| Pattern         | Backend                          | Frontend                                                |
| --------------- | -------------------------------- | ------------------------------------------------------- |
| **Strategy**    | `ArchitectureAdapter` (ABC)      | `BlockNodeComponent`, `LayoutStrategy`, `DetailPanelComponent` |
| **Registry**    | `AdapterRegistry`                | `BlockRegistry`, `LayoutRegistry`, `DetailRegistry`     |
| **Builder**     | `BlockBuilder` (fluent API)      | —                                                       |
| **Repository**  | `ConfigRepository` (Protocol)    | `ArchitectureRepository` (interface)                    |
| **Service**     | `ArchitectureService`            | `useArchitecture` hook                                  |
| **DI**          | FastAPI `Depends()`              | Constructor injection + `useMemo` in hooks              |

These patterns are not ceremony — each enables a specific kind of extensibility:
- **Strategy + Registry** → adding a new architecture or block renderer is a new class + one registration line.
- **Builder** → adding a new field to `Node` doesn't break N callers because they use `.field(value)` chains, not positional args.
- **Repository** → tests inject `FakeConfigRepository` without mocking frameworks.
- **Service** → orchestration is testable without HTTP, FastAPI, or React.

**Do not "simplify" these away** by replacing classes with functions, registries with `if/elif`, or DI with module-level singletons. They look like overengineering on day one; on day fifty (after MoE + sparse attention + Mamba have been added) they are the reason adding the next block type is still a tightly-localized change.

### 3. Patterns we deliberately don't use

No DI container. No event bus. No CQRS. No DDD aggregates. The codebase is small; the six patterns above pay for themselves; anything more would be ceremony.

Likewise, **pure functions stay as functions** — `param_formulas.py` is a module of free functions, not a static-method `ParamCalculator` class. A class wrapping pure functions with no state is a namespace, not a design pattern.

## The Spec contract — the cross-app boundary

The `Spec` (and its recursive `Node`) is the only data structure crossing between backend and frontend. Defined in two places:

- **Source of truth**: [`backend/src/aakar_api/domain/spec.py`](backend/src/aakar_api/domain/spec.py) (Pydantic v2).
- **Hand-mirrored**: [`frontend/src/domain/spec.ts`](frontend/src/domain/spec.ts) (TS types).
- **Canonical doc**: [`docs/spec-contract.md`](docs/spec-contract.md).

**When the contract changes, all three update in the same commit.** The shape is small enough (~6 fields × 2 types) that drift is easy to catch in PR review. The user explicitly chose this two-source manual sync over codegen tooling.

## How this repo grows — extension playbook

The whole point of this codebase. Two flows, both documented step-by-step in `docs/`:

### Adding a new block type (e.g., sparse_attention)

The full guide: [`docs/block-types.md`](docs/block-types.md). Short version:

1. **Backend**: add a parameter formula to `backend/src/aakar_api/adapters/building/param_formulas.py` (pure function, with a one-line comment explaining the math). Then in the adapter that emits this block, use `BlockBuilder("...", "sparse_attention").label(...).build()`.
2. **Frontend (optional)**: write `frontend/src/presentation/blocks/SparseAttentionNode.tsx`. Register with `blockRegistry.register("sparse_attention", SparseAttentionNode)` in `register.ts`. Skip step 2 and `GenericBlockNode` handles it.
3. **Frontend (optional)**: custom detail panel + `detailRegistry.register(...)`.
4. **Frontend (optional)**: custom layout via `layoutRegistry.register("sparse_attention", strategy)`.

Each step is a **new file plus one registration line**. No edits to existing block components or registries.

### Adding a new architecture (e.g., Mixtral, Mamba)

The full guide: [`docs/adapters.md`](docs/adapters.md). Short version:

1. **New file**: `backend/src/aakar_api/adapters/mixtral.py` with `class MixtralAdapter(ArchitectureAdapter)`. Declare `supported_model_types = ("mixtral",)` and implement `build(config, model_id) -> Spec` using `BlockBuilder` + helpers.
2. **New formulas**: add to `adapters/building/param_formulas.py` (with comments explaining the math).
3. **One line in [`catalog.py`](backend/src/aakar_api/adapters/catalog.py)**: `registry.register(MixtralAdapter())`. This is the **only** place the system enumerates known adapters.
4. **Fixture + test**: drop a `tests/fixtures/mixtral_8x7b.json` and a `tests/unit/test_mixtral_adapter.py`.

Zero edits to `LlamaFamilyAdapter`, `AdapterRegistry`, `ArchitectureService`, or any route. The dispatcher resolves the new adapter automatically.

### The "study cadence" pattern

Each new concept the user studies follows roughly this rhythm:

1. Read the paper / source code.
2. Identify the new block type(s) and their parameter formulas.
3. Add the formulas with a WHY comment that traces back to the math.
4. Emit the new type from the relevant adapter via `BlockBuilder`.
5. Optionally write a custom renderer that visualizes what's new (e.g., a sparsity-pattern mini-diagram for sparse attention).
6. Update `docs/spec-contract.md` block type catalog and `docs/block-types.md` if needed.

The repo state after step 4 is already useful — the new block renders via the generic card with correct labels and params. Custom rendering is polish.

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
cd backend && uv run pytest

# Type-check + build
cd frontend && pnpm typecheck
cd frontend && pnpm build

# Production images (each app standalone)
docker build --target prod -t aakar-api  ./backend
docker build --target prod --build-arg VITE_API_URL=https://api.example.com -t aakar-web ./frontend
```

## Conventions to follow when editing

- **Pin all dependency versions** exactly. No `^`, no `~`, no floating.
- **OOP, not scripts.** Use the existing patterns — adapters are classes inheriting `ArchitectureAdapter`, registries are classes, repositories are classes. Don't replace any of this with module-level functions + decorators, even if it "looks simpler."
- **One file per concept.** A new adapter is a new file. A new block renderer is a new file. Don't pile multiple unrelated classes into one module.
- **Comments only where the WHY is non-obvious**, especially in `param_formulas.py` — each formula gets a one-line comment that traces to the underlying math. That's the study-repo angle.
- **Frozen domain objects.** `Spec` and `Node` are `frozen=True` Pydantic models / `Readonly<>` TS types. Treat them as immutable; build new instances, don't mutate.
- **No CSS `@import` after `@tailwind` directives.** PostCSS rejects this; put `@import` first.
- **React Flow `fitView` is initial-mount only.** When the view changes (level 1 → 2 → 3), pass a changing `key` prop so the canvas remounts and refits. See `Canvas.tsx`.
- **Selection state lives in our Zustand store, not in React Flow.** Don't read React Flow's `selected` prop in renderers — read `data.isSelected` (set by `Canvas.tsx`).

## Things to NOT do

- ❌ **Don't merge backend + frontend into a monorepo** (no `apps/api`, `apps/web`, no shared `packages/`). The user explicitly chose top-level `backend/` and `frontend/` because each deploys independently. The Spec is hand-mirrored on purpose.
- ❌ **Don't add codegen** for the Spec types (Pydantic → TS). Two hand-maintained files in the same commit is the chosen contract.
- ❌ **Don't add a `huggingface-hub` Python dep** — one `httpx.AsyncClient.get` is enough for fetching `config.json`.
- ❌ **Don't add response validation on the frontend.** Trust the backend's Pydantic-validated output; structural TS typing is sufficient.
- ❌ **Don't replace `class FooAdapter(ArchitectureAdapter)` with `@register def foo_adapter(...)`.** That was an earlier draft of the design; the user rejected it in favor of OO + SOLID.
- ❌ **Don't commit `node_modules/`, `.venv/`, `dist/`, `__pycache__/`** — `.gitignore` and `.dockerignore` already cover these.
- ❌ **Don't add features outside v0.1 scope** without checking with the user first: no tokenizer view, no model card, no comparison view, no animation, no 3D, no dark mode, no share-by-URL, no auth.

## v0.1 ground truth (verified)

- All 35 backend tests pass.
- Llama-3-8B fixture → 35 nodes, total params 8.03B (matches reality).
- Qwen3-0.6B live fetch → 31 nodes, 596M params, attention children `[q, k, v, sdpa, o]` correct.
- All three zoom levels render correctly in the browser; fan-out layout for self_attention works.
- Generic fallback shows amber banner + single node for unsupported types (e.g., `gpt2`).
- `docker compose up --build` brings both services up healthy with hot reload via bind mounts.

If something in this list breaks after a change, that's a regression — fix the change, don't update the list.

## Where to look first

| Goal                                                    | Open this                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| Understand the overall design                           | [`docs/architecture.md`](docs/architecture.md)                   |
| Add a new model architecture                            | [`docs/adapters.md`](docs/adapters.md)                           |
| Add a new block type and/or custom renderer             | [`docs/block-types.md`](docs/block-types.md)                     |
| Look up the Spec JSON shape                             | [`docs/spec-contract.md`](docs/spec-contract.md)                 |
| Find the adapter dispatch site                          | [`backend/src/aakar_api/adapters/catalog.py`](backend/src/aakar_api/adapters/catalog.py) |
| Find the frontend Strategy registries                   | [`frontend/src/presentation/{blocks,layout,details}/`](frontend/src/presentation/)        |
| Find the composition roots                              | [`backend/src/aakar_api/main.py`](backend/src/aakar_api/main.py) and [`frontend/src/main.tsx`](frontend/src/main.tsx) |
