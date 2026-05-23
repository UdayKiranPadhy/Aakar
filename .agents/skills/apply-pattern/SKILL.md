---
name: apply-pattern
description: Suggest which classic design pattern (Strategy, Registry, Builder, Factory, Repository, Service, Observer, Decorator, Composite, Adapter, Command, Template Method, etc.) fits a problem the user is solving, and sketch the structure in their stack. Trigger when the user says "what pattern fits", "/apply-pattern", "design help", "how should I structure X", or describes a design problem looking for guidance. Do NOT trigger for already-decided implementations, simple bug fixes, or when the user has already named a pattern and just wants help applying it (jump straight in).
---

# Apply a design pattern

Help the user pick the right classic design pattern for the problem they're solving — *or* decide that no pattern is needed (avoid ceremony). Sketch the chosen pattern's structure in their language and reference Aakar's existing implementations as concrete examples.

## Methodology

### Step 1 — Understand the problem

Ask up to **two** clarifying questions to nail down:
- **What varies?** (Which behavior, type, or value will change between cases?)
- **At what time does it vary?** (Compile-time → maybe no pattern needed. Runtime by config → Strategy. Runtime by data shape → Visitor. Runtime by event → Observer.)
- **How many variations are expected?** (1-2 forever → just write `if/else`. 3-10 → pattern. Many or unknown → Registry-based extensibility.)

Only ask if the answer isn't already evident from the user's description.

### Step 2 — Match to the catalog

Pick **one** primary pattern. If two seem to combine naturally (e.g., Strategy + Registry, or Builder + Factory), name both but identify which is primary.

If the problem is small enough to not need a pattern, **say so explicitly** and propose the simpler alternative (a function, a `dict` lookup, a single class). Don't invent ceremony.

### Step 3 — Sketch in the user's stack

Provide a **concrete** sketch in Python (if backend) or TypeScript (if frontend) showing:
- The abstract interface / base class (with method signatures).
- One concrete implementation.
- The wiring/composition site.
- How a future variant is added.

Keep the sketch under ~30 lines. Aim for "I could paste this and start filling it in."

### Step 4 — Reference a working example

If the pattern exists somewhere in Aakar already, point at it: `backend/src/aakar_api/adapters/registry.py` is the canonical Registry; `adapters/building/block_builder.py` is the canonical Builder; etc. Saves you from re-explaining the structure.

## Pattern catalog with trigger conditions

### Creational

| Pattern    | Use when                                                                     | Aakar example                                        |
| ---------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Builder** | Constructing one object with many optional fields (>4-5)                    | `BlockBuilder` (`adapters/building/block_builder.py`) |
| **Factory** | Selecting one of many concrete types at runtime by some key                 | `AdapterRegistry.resolve(model_type)` (functions as a factory) |
| **Abstract Factory** | Producing families of related objects                              | (not used in v0.1)                                   |
| **Singleton** | One instance per process for a stateful resource                          | `httpx.AsyncClient` set on `app.state` — but prefer DI |

### Structural

| Pattern    | Use when                                                                     | Aakar example                                        |
| ---------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Adapter** | Incompatible interface bridging (legacy API → modern interface)             | `BlockFlowNode` adapts our `Node` to React Flow's interface |
| **Composite** | Tree of uniform parts treated identically by clients                       | `Node.children: list[Node]` — recursive Spec tree     |
| **Decorator** | Add behavior without subclassing; stackable                                | FastAPI's `@app.exception_handler` decorators         |
| **Facade**    | Simplify a complex subsystem with one entry point                          | `ArchitectureService` over (repo + registry + adapter) |
| **Proxy**     | Stand-in for another object (caching, lazy load, auth)                     | (not used in v0.1)                                   |

### Behavioral

| Pattern         | Use when                                                                | Aakar example                                        |
| --------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| **Strategy**    | Multiple interchangeable algorithms / behaviors, chosen at runtime      | `ArchitectureAdapter` subclasses; `LayoutStrategy`    |
| **Observer**    | One-to-many notifications; loose coupling between publisher + subscribers | Zustand store + subscribed components                 |
| **Command**     | Encapsulate an action so it can be queued, logged, undone               | (not used in v0.1)                                   |
| **Template Method** | Skeleton algorithm with variation points (hook methods)             | `ArchitectureAdapter.build()` — common shape, helpers vary |
| **State**       | Object's behavior changes based on internal state                       | (not used in v0.1)                                   |
| **Iterator**    | Traverse a collection without exposing structure                        | (not used; Python iterables are sufficient)           |
| **Visitor**     | Operation across heterogeneous types in a tree                          | (consider if rendering grows complex)                 |
| **Mediator**    | Centralize complex interactions between many objects                    | (not used in v0.1)                                   |

### Application-layer / non-GoF

| Pattern         | Use when                                                                | Aakar example                                        |
| --------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| **Repository**  | Abstract data access from business logic                                | `ConfigRepository` Protocol + `HFConfigRepository`   |
| **Service Layer** | Orchestration logic separate from transport/UI                        | `ArchitectureService`                                |
| **Registry**    | Look up implementations by key, with a default fallback                 | `AdapterRegistry`, `BlockRegistry`, `LayoutRegistry`, `DetailRegistry` |
| **DI / IoC**    | Composition root assembles concretes; everything else depends on abstractions | FastAPI `Depends()` chain in `api/dependencies.py`   |
| **DTO / Value Object** | Immutable data carrier across boundaries                         | `Spec`, `Node` (Pydantic with `frozen=True`)         |

## When NOT to use a pattern

Patterns earn their place via extensibility. If you can confidently answer **no** to all of these, just write the straight-line code:

- "Will there be a second implementation of this?"
- "Will this need to be tested by injecting a fake?"
- "Is the construction non-trivial (many fields, validation, multi-step)?"
- "Will adding a new variant otherwise touch many files?"

A single-implementation class wrapping pure functions is ceremony, not a pattern. Same for `@dataclass`es with no methods.

## Output format

```
## Pattern recommendation

**Problem**: <one-sentence restatement of what the user is solving>
**What varies**: <the axis of variation>
**Recommended pattern**: <name>
**Why this fits**: <2-3 sentences>

## Structure

<~30 lines of code sketch in the user's language>

## How to extend later

<2-3 sentences describing what a future variant would look like — a new file, a new registration line, etc.>

## Aakar reference

<file path + brief pointer if a working example exists in the repo>
```

If recommending no pattern, drop the structure section and explain what to write instead in 2-3 sentences.

## Examples

### Example: "I need to add support for caching HF configs"

- **What varies**: where configs come from (live HF vs cached vs in-memory test data).
- **Pattern**: Decorator on `ConfigRepository`. New class `CachingConfigRepository(ConfigRepository)` wraps another `ConfigRepository`, checks cache, delegates on miss.
- **Why not Repository alone**: we already have one; we want to *add* caching as a layer.
- **Why not state in HFConfigRepository**: violates SRP.

### Example: "I want to log every architecture request"

- **What varies**: nothing yet (one logging behavior).
- **Pattern**: probably none. Add a FastAPI middleware (existing infrastructure) or one log line in the route handler.
- **Why no pattern**: there's no axis of variation. Don't wrap `ArchitectureService` in a `LoggingService` decorator yet.

### Example: "I need three different export formats"

- **What varies**: the format (JSON, YAML, GraphML).
- **Pattern**: Strategy + Registry. `SpecExporter` ABC with one `export(spec) -> bytes` method; concrete `JsonExporter`, `YamlExporter`, `GraphMLExporter`. Resolve by format name.
- **Why not just three functions**: a registry pattern means adding a fourth format is a new file + one registration; OCP satisfied.
