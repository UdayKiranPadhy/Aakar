---
name: clean-architecture-check
description: Verify code follows layered Clean / Hexagonal-lite architecture (domain → application → infrastructure → presentation), with the dependency rule that lower layers know nothing about higher ones. Trigger when the user says "check layers", "/clean-architecture-check", "audit imports", "is this in the right layer?", or asks to verify architectural compliance of a module, diff, or directory. Do NOT trigger for general design-pattern questions (use apply-pattern), SOLID-specific reviews (use solid-review), or simple lint/style checks.
---

# Clean-architecture check

Verify that the code under review respects the layered architecture's **dependency rule**: lower layers know nothing about higher layers. Detect leaks (domain importing framework, application importing infrastructure directly, presentation reaching into domain to mutate state, etc.) and propose precise fixes.

## The layers (Aakar's instantiation)

| Layer            | Responsibility                                            | May import from              |
| ---------------- | --------------------------------------------------------- | ---------------------------- |
| **Domain**       | Pure types, value objects, domain exceptions              | *(nothing else in this repo)* |
| **Application**  | Use cases / orchestration. Declares interfaces it needs.  | Domain                       |
| **Infrastructure** | Concrete external integrations. Implements Application's interfaces. | Domain (and Application's interfaces only) |
| **Presentation / API** | UI components / HTTP routes. Composition root.         | All layers (wires them)      |

**The rule**: an arrow can go up but never down. If `domain/spec.py` imports from `application/`, that's a leak. If `application/architecture_service.py` imports from `infrastructure/hf_config_repository.py` (the concrete), that's a leak — it should import from `application/interfaces.py` (the Protocol).

## Methodology

### Step 1 — Determine the scope

- If the user names a file or directory, use that.
- If they say "the diff", use `git diff main...HEAD` to enumerate changed files.
- If unclear, ask once: "scope = the current branch's diff, or a specific directory?"

### Step 2 — Map files to layers

For each file in scope, identify its layer from its path:
- `backend/src/aakar_api/domain/**` → Domain
- `backend/src/aakar_api/application/**` → Application
- `backend/src/aakar_api/infrastructure/**` → Infrastructure
- `backend/src/aakar_api/api/**` → API (presentation)
- `backend/src/aakar_api/adapters/**` → Application-adjacent strategies (treat as Application for dependency purposes, with the caveat that adapters import Builder helpers from `adapters/building/` which is cross-cutting)
- `frontend/src/domain/**` → Domain
- `frontend/src/application/**` → Application
- `frontend/src/infrastructure/**` → Infrastructure
- `frontend/src/store/**` → Application-adjacent (state container)
- `frontend/src/presentation/**` → Presentation

If a file's path doesn't match any layer (e.g., the user created a new top-level dir), flag it for placement decision.

### Step 3 — Inspect imports

For each file in scope, list its imports and classify each as:
- **OK** — imports from same or lower layers.
- **Leak** — imports from a higher layer.
- **Concretion leak** — imports a concrete infrastructure type when an interface would suffice (DIP violation).
- **Framework leak** — domain imports from FastAPI / React / framework-specific code.

Use `grep -nE '^(from|import)' <file>` or read the import block directly.

### Step 4 — Report findings + fixes

Group findings by leak type. For each leak, propose a concrete fix:
- **Move the import to a higher layer**: "this concern belongs in `application/`, move the file."
- **Introduce an interface**: "declare a `Protocol` in `application/interfaces.py` and depend on that; infrastructure implements it."
- **Inject instead of construct**: "stop instantiating `httpx.AsyncClient` in this layer; receive it via DI."

## Common leaks to watch for

### Domain leaks

- `from pydantic import BaseModel` — *acceptable* in our repo because Pydantic is the chosen serialization library; treat it as part of the domain's vocabulary. But `from fastapi import ...` in domain is a leak — FastAPI is HTTP-specific.
- `from aakar_api.infrastructure ...` or `from aakar_api.api ...` in a domain file — always a leak.
- Any I/O (file, network, time) in a domain class — domain types should be pure.

### Application leaks

- `from aakar_api.infrastructure.hf_config_repository import HFConfigRepository` in `application/architecture_service.py` — should import `ConfigRepository` from `application/interfaces.py` instead. Concrete wiring happens in `api/dependencies.py`.
- Importing FastAPI: applications shouldn't know about HTTP. If a service has a `Request` parameter, it has leaked.
- Constructing infrastructure inside the service (`self._http = httpx.AsyncClient()`) — same DIP violation as above.

### Infrastructure leaks

- Calling into `presentation/` or `api/` — infrastructure should be passive; the API layer calls it, not the reverse.
- Importing from `application/architecture_service.py` (the concrete) — should only import abstractions if any.

### Frontend leaks

- `presentation/blocks/*.tsx` importing from `application/*` is fine; but `application/useArchitecture.ts` should *not* import any React component.
- `store/archStore.ts` should hold state + setters but not orchestration logic — that lives in hooks.
- `domain/spec.ts` must remain framework-free (no React, no Zustand, no fetch).

## Output format

```
## Layer-compliance report

**Scope**: <files reviewed>
**Overall**: ✓ clean / N leaks found

## Findings

### Leak: <file:line> imports from higher layer
**File**: `frontend/src/domain/navigation.ts:3`
**Import**: `import { useArchStore } from "../store/archStore"`
**Why this is a leak**: `domain/` must not depend on the store (which is application-adjacent).
**Fix**: remove the import; if `domain/navigation.ts` needs state, accept it as a function argument so callers from the application layer pass it in.

### Leak: <file:line> depends on concrete infrastructure (DIP)
**File**: `backend/src/aakar_api/application/architecture_service.py:7`
**Import**: `from aakar_api.infrastructure.hf_config_repository import HFConfigRepository`
**Why this is a leak**: application layer must depend on `ConfigRepository` (Protocol), not on `HFConfigRepository` (concrete).
**Fix**: change the import to `from aakar_api.application.interfaces import ConfigRepository`; remove the `HFConfigRepository` type annotation; keep using the abstract type in `__init__`. Composition still happens in `api/dependencies.py`.

## File-by-file inventory (optional, for larger reviews)

| File                                          | Layer        | Imports look like      | Verdict |
| --------------------------------------------- | ------------ | ---------------------- | ------- |
| `application/architecture_service.py`         | Application  | domain, interfaces     | ✓       |
| `infrastructure/hf_config_repository.py`      | Infra        | domain, app interfaces | ✓       |
| `api/routes.py`                               | API          | application, dependencies | ✓    |
```

End with a prioritized list: fix DIP/framework leaks first (they're load-bearing); cosmetic leaks (e.g., misplaced helpers) last.

## When NOT to flag

- Cross-layer imports from the **composition root** (`backend/main.py`, `frontend/main.tsx`, `frontend/App.tsx`) — these are *supposed* to import from every layer. That's their entire job.
- `api/dependencies.py` importing from infrastructure — this is the DI wiring site; it must know about concrete implementations.
- Test files reaching across layers — test code may need both the interface and a concrete fake.
- `adapters/__init__.py` doing side-effect imports for registration — registries by design know which concretes exist.

## Reference: Aakar's intended layer map

Use these as the canonical "correct" examples when explaining a fix:

| File                                                                       | Layer        | Why it's clean                                          |
| -------------------------------------------------------------------------- | ------------ | ------------------------------------------------------- |
| `backend/src/aakar_api/domain/spec.py`                                     | Domain       | Only imports Pydantic (vocabulary), `__future__`, typing. |
| `backend/src/aakar_api/application/architecture_service.py`                | Application  | Imports `ConfigRepository`, `AdapterRegistry`, `Spec` — all abstractions or domain types. |
| `backend/src/aakar_api/infrastructure/hf_config_repository.py`             | Infra        | Imports `ConfigRepository` (the interface it satisfies) + `httpx`. |
| `backend/src/aakar_api/api/dependencies.py`                                | API          | The wiring site; imports concretes by design.            |
| `frontend/src/application/useArchitecture.ts`                              | Application  | Imports the store (allowed adjacency) + `ArchitectureRepository` interface + error types. |
| `frontend/src/presentation/blocks/GenericBlockNode.tsx`                    | Presentation | Imports types from `BlockRegistry`, UI primitives — never store directly. |

Point reviewees here when they ask "what does a clean layer look like?"
