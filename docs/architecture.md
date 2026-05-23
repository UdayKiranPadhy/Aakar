# Architecture

Aakar is structured as two independent services (`backend/`, `frontend/`) that share a single JSON contract — the **composition Spec**. Each service is internally organized into four layers (Clean / Hexagonal-lite) so that every change has an obvious home.

## Data flow

```
┌──────────┐     model_id      ┌──────────────────────┐
│ Browser  │ ────────────────▶ │ FastAPI route        │
└──────────┘                   │  api/routes.py       │
     ▲                         └────────┬─────────────┘
     │                                  │
     │                                  ▼
     │                         ┌──────────────────────┐
     │                         │ ArchitectureService  │
     │                         │  application/        │
     │                         └─┬─────────────────┬──┘
     │            ConfigRepo     │                 │  AdapterRegistry
     │           ┌───────────────┘                 └────────────┐
     │           ▼                                              ▼
     │  ┌────────────────────────┐              ┌──────────────────────────┐
     │  │ HFConfigRepository     │              │ LlamaFamilyAdapter       │
     │  │  infrastructure/       │              │  adapters/llama_family.py│
     │  └──────────┬─────────────┘              │  ↳ uses BlockBuilder +   │
     │             │ HTTPS                      │      param_formulas      │
     │             ▼                            └────────────┬─────────────┘
     │     huggingface.co/...                                │
     │     /resolve/main/config.json                         │
     │                                                       ▼
     │                                              ┌────────────────────┐
     │                                              │ Spec (Pydantic)    │
     │                                              │  domain/spec.py    │
     │                                              └────────────────────┘
     │                                                       │
     │                            JSON                       │
     └───────────────────────────────────────────────────────┘

Browser:
  HttpArchitectureRepository ──▶ Zustand store ──▶ React Flow canvas
                                                       │
                                                       ├─▶ BlockRegistry    → GenericBlockNode
                                                       ├─▶ LayoutRegistry   → verticalStack | fanOut
                                                       └─▶ DetailRegistry   → GenericDetailPanel
```

## Layered architecture (both sides)

| Layer            | Backend (`backend/src/aakar_api/`)             | Frontend (`frontend/src/`)                          |
| ---------------- | ---------------------------------------------- | --------------------------------------------------- |
| **Domain**       | `domain/spec.py`, `domain/model_config.py`     | `domain/spec.ts`, `domain/navigation.ts`            |
| **Application**  | `application/architecture_service.py`          | `application/useArchitecture.ts`, `useNavigation.ts`|
| **Infrastructure** | `infrastructure/hf_config_repository.py`     | `infrastructure/api/HttpArchitectureRepository.ts`  |
| **Presentation/API** | `api/routes.py`, `api/dependencies.py` etc. | `presentation/canvas`, `blocks`, `layout`, `details`|

**Rule of dependency:** lower layers know nothing about higher layers. The application layer declares the abstractions it needs (`ConfigRepository`, `ArchitectureRepository`); infrastructure provides the concrete implementation; `main.py` / `App.tsx` wire it all up.

## Where each design pattern lives

| Pattern              | Backend                                     | Frontend                                          |
| -------------------- | ------------------------------------------- | ------------------------------------------------- |
| **Strategy**         | `ArchitectureAdapter` (per family)          | `BlockNodeComponent`, `LayoutStrategy`, `DetailPanelComponent` |
| **Registry**         | `AdapterRegistry`                           | `BlockRegistry`, `LayoutRegistry`, `DetailRegistry` |
| **Builder**          | `BlockBuilder` (fluent API for `Node`)      | —                                                  |
| **Repository**       | `ConfigRepository` (abstract Protocol)      | `ArchitectureRepository` (interface)              |
| **Service**          | `ArchitectureService`                       | `useArchitecture` hook (same role)                |
| **DI**               | FastAPI `Depends()` chain in `api/dependencies.py` | Constructor injection + `useMemo` in `App.tsx`    |
| **Composition root** | `main.py` (`create_app()`)                  | `main.tsx` + `App.tsx`                            |

We deliberately **don't** use: DI container, event bus, CQRS, DDD aggregates. The codebase is small; the patterns above pay for themselves; anything more would be ceremony.

## The Spec contract

The Spec is the only thing crossing the wire between the two services. It is documented canonically in [`spec-contract.md`](./spec-contract.md). When it changes:
1. Update `backend/src/aakar_api/domain/spec.py` (source of truth).
2. Update `frontend/src/domain/spec.ts` (hand-mirrored).
3. Update `spec-contract.md`.

All three in the same commit. A small set of fields and immutable shape means drift is easy to catch in PR review.

## Extending the system

The two extension points the user actually uses:

- **Add a new architecture** (e.g., Mixtral, GPT-OSS, Mamba): [`adapters.md`](./adapters.md)
- **Add a new block type + custom renderer** (e.g., `sparse_attention`, `moe_router`): [`block-types.md`](./block-types.md)

Both flows are designed so that new code is *added*, never modifies existing code (Open/Closed Principle).

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

The frontend is just an nginx image serving the built static bundle — drop into any static host (Vercel, Cloudflare Pages, S3+CloudFront).

For local development, the repo-root `docker-compose.yml` orchestrates both with bind-mounted source code so edits hot-reload (Vite HMR + uvicorn --reload).
