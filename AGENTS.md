# AGENTS.md

> Operational guide for AI coding agents (Claude Code, Cursor, Aider, Codex, etc.) working in this repo. For architectural context and design intent, read [CLAUDE.md](CLAUDE.md) first — this file is the **checklist of what to do and verify**, not the philosophy.

## TL;DR

- Two top-level apps: `backend/` (Python/FastAPI) and `frontend/` (React/Vite). Each is standalone-deployable. **Don't merge them into a monorepo.**
- This is a **study repo** designed to grow over time (new block types, new architectures). Every change should preserve the Open/Closed extension pattern — new files + one registration line, no edits to existing classes.
- Tech stack: Python 3.12 / FastAPI / Pydantic v2 / uv on the backend; Vite / React 18 / TS 5.7 / Tailwind 3 / `@xyflow/react` / Zustand / pnpm on the frontend. **All versions pinned exactly.**
- Patterns are load-bearing: **Strategy + Registry + Builder + Repository + Service + DI**. Don't simplify them away.

## Setup commands

```bash
# Prerequisites: node >= 20, python 3.12, docker, pnpm@9.15.0, uv

# Full local stack via docker compose (recommended)
docker compose up --build

# Or run each service standalone:
cd backend && uv sync
cd backend && uv run uvicorn aakar_api.main:app --reload     # API on :8000

cd frontend && pnpm install
cd frontend && pnpm dev                                       # Web on :5173
```

The backend reads `CORS_ORIGINS` (defaults to `http://localhost:5173`). The frontend reads `VITE_API_URL` (defaults to `http://localhost:8000`).

## Build, test, lint commands

| Action                      | Command                                                    |
| --------------------------- | ---------------------------------------------------------- |
| Backend tests               | `cd backend && uv run pytest`                              |
| Backend lint (check only)   | `cd backend && uv run ruff check .`                        |
| Backend lint (fix)          | `cd backend && uv run ruff check --fix . && uv run ruff format .` |
| Backend type-check          | `cd backend && uv run mypy src`                            |
| Frontend type-check         | `cd frontend && pnpm typecheck`                            |
| Frontend production build   | `cd frontend && pnpm build`                                |
| Backend prod image          | `docker build --target prod -t aakar-api ./backend`        |
| Frontend prod image         | `docker build --target prod --build-arg VITE_API_URL=https://api.example.com -t aakar-web ./frontend` |

## Where things live

```
backend/src/aakar_api/
├── domain/          # Spec, Node, ModelConfig, domain exceptions. Pure types.
├── application/     # ArchitectureService + ConfigRepository (Protocol).
├── infrastructure/  # HFConfigRepository (httpx implementation).
├── adapters/        # ArchitectureAdapter (ABC) + concrete adapters + Registry + Builder.
│   ├── catalog.py   # ← Adapter registration site. Edit here to add a new architecture.
│   └── building/    # Cross-cutting: BlockBuilder, param_formulas.
├── api/             # Routes, DI (Depends), CORS, error handlers.
└── main.py          # FastAPI composition root.

frontend/src/
├── domain/          # spec.ts (mirror of spec.py) + navigation helpers.
├── application/     # Hooks: useArchitecture, useNavigation, useSelection.
├── infrastructure/  # HttpArchitectureRepository + ApiError hierarchy.
├── store/           # Zustand container (state + setters, no logic).
├── presentation/
│   ├── canvas/      # React Flow host + BlockFlowNode adapter + dotted edges.
│   ├── blocks/      # ← BlockRegistry + GenericBlockNode + register.ts (add custom renderers here).
│   ├── layout/      # ← LayoutRegistry + verticalStack + fanOut + register.ts.
│   ├── details/     # ← DetailRegistry + GenericDetailPanel + register.ts.
│   └── components/  # ModelInputBar, Breadcrumb, GenericViewBanner, ui/*.
└── main.tsx         # Composition root — side-effect imports for all 3 register.ts files.
```

## Workflows you'll actually do

### Adding a new architecture (e.g., Mixtral)

1. Create `backend/src/aakar_api/adapters/<name>.py` with `class <Name>Adapter(ArchitectureAdapter)`.
   - Declare `supported_model_types`.
   - Implement `build(config, model_id) -> Spec` using `BlockBuilder` and helpers from `adapters/building/`.
2. If new parameter formulas are needed: add pure functions to `adapters/building/param_formulas.py` with a one-line WHY comment each.
3. **Register in `adapters/catalog.py`** — one line: `registry.register(<Name>Adapter())`. This is the only place that enumerates adapters.
4. Add a fixture: `backend/tests/fixtures/<name>_<size>.json` (a real HF config or a minimal slice).
5. Add a test: `backend/tests/unit/test_<name>_adapter.py` (graph shape + total param count within ±1% of the real model).
6. Run `uv run pytest` — should pass without touching any existing test.

If the new model has block types the frontend doesn't recognize, `GenericBlockNode` handles them. Custom rendering is step 7+, see below.

Full guide: [docs/adapters.md](docs/adapters.md).

### Adding a new block type with custom rendering (e.g., sparse_attention)

1. Backend: add the parameter formula in `param_formulas.py`. Emit the new `type` string from the adapter via `BlockBuilder(..., "sparse_attention").build()`.
2. (Optional) Frontend block renderer: create `frontend/src/presentation/blocks/<Name>Node.tsx`. Register in `presentation/blocks/register.ts`:
   ```ts
   blockRegistry.register("sparse_attention", SparseAttentionNode);
   ```
3. (Optional) Custom detail panel: same pattern in `presentation/details/`.
4. (Optional) Custom child layout: same pattern in `presentation/layout/`. Register against the **parent's** `type`.
5. Update `docs/spec-contract.md` block type catalog.

Full guide: [docs/block-types.md](docs/block-types.md).

### Changing the Spec contract

The Spec is hand-mirrored across the wire. **All three of these update in the same commit:**
1. `backend/src/aakar_api/domain/spec.py` (source of truth).
2. `frontend/src/domain/spec.ts`.
3. `docs/spec-contract.md`.

Then update every adapter that constructs `Node`/`Spec` and every frontend component that reads the changed field.

## Pre-commit / pre-PR checklist

Before declaring work done, run **all** of these from the repo root:

```bash
# Backend
cd backend && uv run pytest && uv run ruff check . && uv run mypy src && cd ..

# Frontend
cd frontend && pnpm typecheck && pnpm build && cd ..

# End-to-end smoke (optional but recommended for non-trivial changes)
docker compose up --build -d
curl -sf http://localhost:8000/api/health
curl -sf "http://localhost:8000/api/architecture?model_id=Qwen/Qwen3-0.6B" | python3 -c "import sys,json; s=json.load(sys.stdin); assert len(s['graph']) == 31, 'expected 31 nodes'"
docker compose down
```

For UI changes, also visually verify in the browser (`docker compose up` then open http://localhost:5173). Type a model ID, expand to level 2, expand attention to level 3, paste `gpt2` for the fallback banner.

## Code style

### Python (backend)

- **Ruff**: `line-length = 100`, target `py312`, rules `["E", "F", "I", "B", "UP", "N", "SIM"]`. Config in `backend/pyproject.toml`.
- **Mypy**: `strict = true`. Type annotations on every function signature.
- **Modern Python**: prefer `X | Y` over `Union[X, Y]`; `list[X]` over `List[X]`; `from __future__ import annotations` at the top of every module.
- **Pydantic v2** patterns: `BaseModel` + `ConfigDict(frozen=True)` for value objects. Use `Field(default_factory=...)` for mutable defaults.
- **Public surface** of a module via `__init__.py`'s `__all__` only when it adds clarity (the layer barrels do this; deeply private modules don't need it).

### TypeScript (frontend)

- **Strict TS**: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`. Config in `frontend/tsconfig.app.json`.
- **Function components** + hooks. No class components.
- **Immutable types**: `Readonly<>` wrappers on Spec types; treat domain data as frozen.
- **Imports**: use `import type` for type-only imports — avoids runtime cycles between registries and their default fallbacks.
- **Tailwind** for styling; design tokens in `src/styles/tokens.css`. Use semantic colors (`text-ink`, `border-hairline`, `bg-accent`) defined in `tailwind.config.ts`, not raw hex.
- **No CSS @import after @tailwind directives** — PostCSS rejects this. Put `@import` first in `global.css`.

### Both sides

- **Pin exact versions** in `pyproject.toml` and `package.json`. No `^`, `~`, or floating tags.
- **Comments only when WHY is non-obvious.** The `param_formulas.py` file is the canonical example: each formula has a single-line comment that traces to the underlying math. This is the study-repo angle — the comments are for future-you re-reading the file after learning a new architecture.
- **No emojis in code or docs** unless explicitly requested.
- **No multi-line docstrings.** A module-level one-paragraph docstring is fine; everything else is a one-line comment.

## Patterns to preserve (don't simplify these away)

| Site                                                              | Pattern                          | Why it earns its place                                                |
| ----------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| `adapters/base.py` + `adapters/registry.py` + `adapters/catalog.py` | Strategy + Registry              | Adding a new architecture = new file + one line in catalog. OCP.       |
| `adapters/building/block_builder.py`                              | Builder (fluent)                 | `Node` has 9 fields, most optional. Builder avoids 9-arg constructors. |
| `application/interfaces.py` + `infrastructure/`                   | Repository (Protocol-based)      | DIP: service depends on interface, infrastructure implements it. Trivial fakes for tests. |
| `application/architecture_service.py`                             | Service layer                    | Orchestration is testable without HTTP, FastAPI, or React.            |
| `api/dependencies.py`                                             | DI via FastAPI `Depends()`       | Tests override with `app.dependency_overrides[...]`.                  |
| `presentation/blocks/BlockRegistry.ts` and siblings               | Strategy + Registry (frontend)   | Adding a custom block renderer = new file + one `register()` call.    |
| `infrastructure/api/HttpArchitectureRepository.ts`                | Repository (frontend)            | Hook receives the interface; tests inject a `Stub` repo.              |

If any of these starts to feel "too abstract" — re-read CLAUDE.md's "this is a study repo" section. They are the reason the *next* extension is still small.

## Things to NOT do

- ❌ Don't merge frontend and backend into a monorepo. The user explicitly chose top-level `backend/` and `frontend/` because each deploys independently.
- ❌ Don't add codegen for the Spec (Pydantic → TS). Two hand-maintained files in the same commit is the chosen contract.
- ❌ Don't replace `class FooAdapter(ArchitectureAdapter)` with `@register def foo_adapter(...)`. The user explicitly rejected the function+decorator design in favor of OO + SOLID.
- ❌ Don't add a DI container, event bus, CQRS, or DDD aggregates. The codebase is small; existing patterns suffice.
- ❌ Don't wrap pure functions in static-method classes. `param_formulas.py` stays as free functions.
- ❌ Don't add `huggingface-hub` as a Python dep — one `httpx.AsyncClient.get` does the job.
- ❌ Don't add response validation on the frontend. Trust the backend's Pydantic-validated output.
- ❌ Don't add features outside v0.1 scope without asking: no tokenizer view, no model card, no comparison view, no dark mode, no share-by-URL, no auth, no DB, no analytics, no 3D, no animation.

## Subtle gotchas (real things that bit during v0.1)

- **React Flow's `fitView` prop fires once on mount.** When swapping views (level 1 → 2 → 3) without remounting, the viewport stays in the old position. Fix: pass `key={expansionPath.join("/") || "root"}` so the canvas remounts on view change. Already done in `Canvas.tsx`; preserve this.
- **CSS `@import` rules must come before `@tailwind` directives.** PostCSS rejects the reverse order. See `frontend/src/styles/global.css`.
- **FastAPI `TestClient(app)` doesn't trigger lifespan.** Use the context-manager form (`with TestClient(app) as c: yield c`) in pytest fixtures — without it, `app.state.http_client` is never set and any route reaching that dependency throws.
- **HuggingFace returns 401/403 (not 404) for missing models.** They don't disambiguate "doesn't exist" from "exists but you're not authorized." Our mapping treats both as `ModelGated` → 403 with a user-friendly message. Don't try to "fix" this to 404 — the upstream truly doesn't distinguish.
- **React Flow node selection state is React Flow's, not ours.** Read `data.isSelected` (set by `Canvas.tsx` from our Zustand store), not React Flow's `selected` prop. Selection in this app is owned by the store.

## Security & safety

- Aakar uses **no HuggingFace auth token**. Only public configs are accessible. If a user pastes a gated model ID (e.g., `gpt2`, which requires accepting a license), the backend returns 403. Don't add token support without explicit user approval.
- The model ID is validated against `^[a-zA-Z0-9_\-./]+$` before any HTTP request. Don't widen this regex.
- HTTP timeout to HF Hub is 5 seconds. Don't extend it; if a config doesn't return that fast, the upstream is misbehaving and we should fail fast.
- CORS defaults to localhost only. In production, set `CORS_ORIGINS` to the deployed frontend's origin — never use `*`.
- The frontend has no authentication, no cookies, no localStorage usage. Don't add any without explicit user approval.

## Actions that need explicit human approval

- Adding new dependencies (any new package in `pyproject.toml` or `package.json`).
- Bumping major versions of pinned deps.
- Changing the Spec contract (the cross-app boundary).
- Adding HuggingFace authentication / token support.
- Adding any persistence (DB, file system writes beyond cache, cookies, localStorage).
- Adding analytics, telemetry, or any outbound network calls beyond the HF Hub fetch.
- Force-pushing to a shared branch.
- Adding CI/CD configuration (we don't have any in v0.1; add only when the user asks).

## PR / commit conventions

- **Conventional commits** style: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:` followed by a concise imperative summary.
- **One commit per coherent change.** A new adapter is one commit (the adapter file + the catalog line + the fixture + the test). The frontend renderer for the same architecture is a separate commit (it can ship independently).
- **Spec changes** (the cross-app contract) get their own commit so reviewers can clearly see the contract delta.
- **Don't commit** `node_modules/`, `.venv/`, `dist/`, `__pycache__/`, `.pytest_cache/`, `.ruff_cache/`, `.mypy_cache/`, `coverage`. `.gitignore` covers these.
- **Always include** updated tests when changing adapters or service logic. If adding a new architecture, include both the fixture config and a passing unit test.

## Project docs index

- [`README.md`](README.md) — user-facing project overview and quickstart.
- [`CLAUDE.md`](CLAUDE.md) — design intent, architectural rules, "why we did it this way."
- [`AGENTS.md`](AGENTS.md) — this file (operational checklist).
- [`docs/architecture.md`](docs/architecture.md) — layered design, data flow, deployment story.
- [`docs/adapters.md`](docs/adapters.md) — step-by-step guide to adding a new model architecture.
- [`docs/block-types.md`](docs/block-types.md) — step-by-step guide to adding a new block type and renderer.
- [`docs/spec-contract.md`](docs/spec-contract.md) — canonical Spec JSON schema with examples.
- [`backend/README.md`](backend/README.md) — backend-specific dev notes.
- [`frontend/README.md`](frontend/README.md) — frontend-specific dev notes.
