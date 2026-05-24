# Architecture

Aakar is structured as two independent services (`backend/`, `frontend/`) that share a single JSON contract — the **composition Spec**. Each service is internally organized into four layers (Clean / Hexagonal-lite).

## Data flow

```
┌──────────┐     model_id      ┌──────────────────────┐
│ Browser  │ ────────────────▶ │ FastAPI route        │
└──────────┘                   │  api/routes.py       │
     ▲                         └────────┬─────────────┘
     │                                  ▼
     │                         ┌──────────────────────┐
     │                         │ ArchitectureService  │
     │                         │  application/        │
     │                         └─┬─────────────────┬──┘
     │           SpecCache      │                 │  Introspector
     │           ┌──────────────┘                 └──────────────┐
     │           ▼                                                ▼
     │  ┌────────────────────────┐                   ┌──────────────────────────┐
     │  │ DiskSpecCache          │                   │ TransformersIntrospector │
     │  │  infrastructure/       │                   │  infrastructure/         │
     │  │  spec_cache.py         │                   │  transformers_           │
     │  │                        │                   │   introspector.py        │
     │  │  backend/.cache/specs/ │                   │                          │
     │  │   *.json               │                   │  AutoConfig + meta-device│
     │  └────────────────────────┘                   │  init_empty_weights()    │
     │                                                │  walk named_children()   │
     │                                                └────────────┬─────────────┘
     │                                                             │
     │                                                             ▼
     │                                                    ┌────────────────────┐
     │                                                    │ Spec (Pydantic)    │
     │                                                    │  domain/spec.py    │
     │                                                    └────────────────────┘
     │                                                             │
     │                            JSON                             │
     └─────────────────────────────────────────────────────────────┘

Browser:
  HttpArchitectureRepository ──▶ Zustand store ──▶ React Flow canvas
                                                       │
                                                       ├─▶ BlockRegistry    → GenericBlockNode
                                                       ├─▶ LayoutRegistry   → verticalStack | fanOut
                                                       └─▶ DetailRegistry   → GenericDetailPanel
```

## Layered architecture (both sides)

| Layer                | Backend (`backend/src/aakar_api/`)                                       | Frontend (`frontend/src/`)                            |
| -------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------- |
| **Domain**           | `domain/spec.py`, `domain/exceptions.py`                                 | `domain/spec.ts`, `domain/navigation.ts`              |
| **Application**      | `application/architecture_service.py`, `application/interfaces.py`       | `application/useArchitecture.ts`, `useNavigation.ts`  |
| **Infrastructure**   | `infrastructure/transformers_introspector.py`, `infrastructure/introspection/`, `infrastructure/spec_cache.py` | `infrastructure/api/HttpArchitectureRepository.ts` |
| **Presentation/API** | `api/routes.py`, `api/dependencies.py`, `api/errors.py`                  | `presentation/canvas`, `blocks`, `layout`, `details`  |

**Rule of dependency:** lower layers know nothing about higher layers. The application layer declares the abstractions it needs (`Introspector`, `SpecCache`); infrastructure provides the concrete implementations; `main.py` / `App.tsx` wire it all up.

## Where each design pattern lives

| Pattern              | Backend                                                  | Frontend                                          |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| **Strategy**         | —                                                        | `BlockNodeComponent`, `LayoutStrategy`, `DetailPanelComponent` |
| **Registry**         | —                                                        | `BlockRegistry`, `LayoutRegistry`, `DetailRegistry` |
| **Repository**       | `Introspector`, `SpecCache` (abstract Protocols)         | `ArchitectureRepository` (interface)              |
| **Service**          | `ArchitectureService`                                    | `useArchitecture` hook                            |
| **DI**               | `app.state` set in `lifespan`, surfaced via `Depends()`  | Constructor injection + `useMemo` in `App.tsx`    |
| **Composition root** | `main.py` (`create_app()` + `lifespan`)                  | `main.tsx` + `App.tsx`                            |

The backend used to host a Strategy + Registry + Builder system of per-family `ArchitectureAdapter`s. It was removed when introspection landed — see [`introspection.md`](./introspection.md) for the rationale. The Strategy/Registry pattern still earns its keep on the frontend, where rendering customization per module class is the natural extension point.

## The Spec contract

The Spec is the only thing crossing the wire between the two services. It is documented canonically in [`spec-contract.md`](./spec-contract.md). When it changes:
1. Update `backend/src/aakar_api/domain/spec.py` (source of truth).
2. Update `frontend/src/domain/spec.ts` (hand-mirrored).
3. Update `spec-contract.md`.

All three in the same commit.

## Extending the system

- **Add a custom renderer for a module class** (e.g., a fan-out diagram for `LlamaSdpaAttention`): [`block-types.md`](./block-types.md).
- **Understand or modify the introspection flow** (config → nn.Module → Spec): [`introspection.md`](./introspection.md).

Aakar now picks up new architectures *automatically*: as long as `config.architectures[0]` resolves to a class in stock `transformers`, the introspector walks it. New HF releases (Mamba, MoE variants, etc.) become available without backend code changes the same day `pip install -U transformers` lands them.

## Production deployment

Each service has a standalone multi-stage Dockerfile with a `prod` target. Deploy independently:

```bash
# Backend
docker build --target prod -t aakar-api ./backend
docker push <registry>/aakar-api

# Frontend (VITE_API_URL baked at build time)
docker build --target prod \
  --build-arg VITE_API_URL=https://api.aakar.example.com \
  -t aakar-web ./frontend
docker push <registry>/aakar-web
```

The backend prod image ships `transformers` + CPU `torch` + `accelerate`. On Linux the CPU-only torch is pinned via `[tool.uv.sources]` in `backend/pyproject.toml` to avoid pulling CUDA wheels.

For local development, the repo-root `docker-compose.yml` orchestrates both with bind-mounted source code so edits hot-reload (Vite HMR + uvicorn --reload).
