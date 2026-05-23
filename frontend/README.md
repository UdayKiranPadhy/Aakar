# Aakar Frontend

React + Vite SPA that renders LLM architectures as interactive 2D diagrams.

## Layered architecture

```
presentation/   ← UI components, React Flow canvas, three Strategy registries (Block, Layout, Detail)
application/    ← Use-case hooks (useArchitecture, useNavigation, useSelection)
infrastructure/ ← HttpArchitectureRepository — talks to the backend
store/          ← Zustand state container (no logic, just state + setters)
domain/         ← Spec & Node types (mirror of backend/domain/spec.py), navigation value objects
styles/         ← Tokens, fonts, Tailwind setup
```

Each layer depends only on lower layers. `App.tsx` + `main.tsx` are composition roots.

## Local dev (no Docker)

```bash
pnpm install
pnpm dev
```

Opens on http://localhost:5173. Set `VITE_API_URL` (default `http://localhost:8000`) to point at a non-local backend.

## Type-check + build

```bash
pnpm typecheck
pnpm build
```

## Docker

Dev mode is orchestrated from the repo root via `docker compose up frontend`. Production:

```bash
docker build --target prod --build-arg VITE_API_URL=https://api.example.com -t aakar-web .
```

## Extending

- New block renderer: `src/presentation/blocks/register.ts`
- New detail-panel content: `src/presentation/details/register.ts`
- New layout strategy: `src/presentation/layout/register.ts`

See `../docs/block-types.md` for the full playbook.
