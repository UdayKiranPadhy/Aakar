# Aakar Frontend

React + Vite SPA that renders LLM architectures as interactive 2D diagrams, with
side-by-side model comparison and a self-contained "Learn" knowledge base.

## Layered architecture

```
presentation/   ← UI: React Flow canvas + Strategy registries (Block, Layout, Detail,
                  ModelView, CompareView, LearnView) and the landing/model/compare/learn surfaces
application/    ← Use-case hooks (useArchitecture, useNavigation, useSelection, useUrlSync)
infrastructure/ ← HttpArchitectureRepository + typed error hierarchy — talks to the backend
store/          ← Zustand state container (state + setters, no logic)
domain/         ← Spec & Node types (mirror of backend/domain/spec.py), navigation value objects
styles/         ← tokens.css (design tokens) + global.css. CSS Modules per component — no Tailwind.
```

Each layer depends only on lower layers. `App.tsx` + `main.tsx` are the
composition roots; `main.tsx` does the side-effect `register` imports that
populate the Strategy registries.

## Local dev (no Docker)

```bash
pnpm install   # needs Node ≥ 18
pnpm dev
```

Opens on http://localhost:5173. Set `VITE_API_URL` (default
`http://localhost:8000`) to point at a non-local backend.

## Type-check + build

```bash
pnpm build      # tsc -b && vite build — this is the real type-check
pnpm test:run   # Vitest
```

> Note: `pnpm typecheck` against the root `tsconfig` is effectively a no-op
> (references-only). Use `pnpm build` to catch real type errors.

## Docker

Dev mode is orchestrated from the repo root via `docker compose up frontend`. Production:

```bash
docker build --target prod --build-arg VITE_API_URL=https://api.example.com -t aakar-web .
```

## Extending

Each registry maps a key to a Strategy component — extend by adding a file and
one `register()` call, never by editing existing components:

- **Block renderer** for a module class → `src/presentation/blocks/register.ts`
- **Detail-panel** content → `src/presentation/details/register.ts`
- **Layout strategy** → `src/presentation/layout/register.ts`
- **Model / Compare / Learn view** (a new dashboard tab) → the matching
  `*-views/register.tsx`
- **Learn content** (paper, blog, timeline milestone, architecture era, concept)
  → append one object to a data file; see the
  [Learn content authoring guide](src/presentation/learn/content/README.md).

See [`../docs/block-types.md`](../docs/block-types.md) for the full block/layout/detail playbook.
