---
name: solid-review
description: Review code against the five SOLID principles. Trigger when the user says "review for SOLID", "check SOLID", "/solid-review", or asks for a SOLID-compliance check on a file, diff, PR, or recently-written code. Do NOT trigger for general code review unrelated to SOLID, for surface-level style/lint review, or when the user explicitly wants only a specific principle (use direct discussion instead).
---

# SOLID review

Walk the user's code through the five SOLID principles, one at a time, in order. For each principle: state the principle in one line, examine the target code, report findings, and recommend specific fixes with file:line references.

## What to review

Default target, in order of preference:
1. The diff against the main branch (`git diff main...HEAD`) if working on a feature branch.
2. The most recently edited files in this session.
3. Whatever file path(s) the user names explicitly.

If the scope is ambiguous, ask the user once: "review the current branch's diff, the file `X`, or something else?" — then proceed.

## The five-pass methodology

For each principle, produce a short structured finding:

- **Status**: pass / minor concern / violation
- **Where**: `path/file.py:line` references for any violations
- **Why**: one sentence explaining the violation (or "complies because...")
- **Fix**: a concrete, actionable change — name the new class, the extracted interface, the field to move, etc. Don't say "consider refactoring"; say "extract `XYZ` into its own class in `path/foo.py`".

### S — Single Responsibility

> A class/module should have one reason to change.

Look for:
- Classes with mixed concerns (e.g., HTTP + business logic, persistence + validation, rendering + state management).
- Modules importing from many unrelated layers.
- Functions over ~50 lines that "do two things."
- "And" in the class name or docstring (`UserManagerAndCache`).

Example violation in Aakar's style: a `HFConfigRepository` that *also* parses the config into a `Spec` is two responsibilities. Fix: keep `HFConfigRepository` to fetching; let the application service call the adapter.

### O — Open/Closed

> Open for extension, closed for modification.

Look for:
- `if isinstance(x, A): ... elif isinstance(x, B): ...` chains — these grow on every new type.
- Central enums or switch statements that every new variant must edit.
- Adding a new feature requires editing five existing files.

In Aakar specifically: adding a new architecture or block type should only add files + one line in `catalog.py` / `register.ts`. If a change edits `LlamaFamilyAdapter` to add `mixtral` support, that's an OCP violation — Mixtral wants its own adapter.

Fix patterns: Strategy + Registry (Aakar's adapter system), polymorphism, function lookup tables.

### L — Liskov Substitution

> Subtypes must be substitutable for their base types without surprising callers.

Look for:
- Subclasses that throw `NotImplementedError` on inherited methods.
- Subclasses that strengthen preconditions or weaken postconditions.
- Subclasses that change the meaning of a method (e.g., a `Square(Rectangle)` whose setter mutates both width and height).
- Interface methods that some implementations effectively ignore.

In Aakar: every `ArchitectureAdapter` subclass must return a valid `Spec` from `build()`. If one returns `None` or raises in normal cases, callers will break.

Fix patterns: split the interface (see ISP); use composition; raise concrete domain exceptions instead of `NotImplementedError`.

### I — Interface Segregation

> Clients shouldn't depend on methods they don't use.

Look for:
- Fat interfaces with many methods where most callers use only one or two.
- Abstract base classes mixing unrelated responsibilities (read + write + validate + render).
- Mock objects in tests that have to stub many methods to satisfy a small need.

In Aakar: `ConfigRepository` is one method (`fetch`) — that's correct. If we added `delete`, `update`, `list`, callers that only fetch would still depend on the rest.

Fix patterns: split into role-specific interfaces (`Readable`, `Writable`); use `typing.Protocol` for structural typing where helpful.

### D — Dependency Inversion

> Depend on abstractions, not concretions. High-level modules don't depend on low-level modules — both depend on abstractions.

Look for:
- Services instantiating their own dependencies (`self._http = httpx.AsyncClient()` inside `ArchitectureService`).
- Application/domain layers importing from infrastructure.
- Hard-coded class names in business logic that should be injected.

In Aakar: `ArchitectureService` depends on `ConfigRepository` (Protocol), never on `HFConfigRepository`. The composition root (`api/dependencies.py`) wires the concrete. If service tests need to mock HTTP, that's a DIP violation — they should inject a fake.

Fix patterns: constructor injection; `Depends()` in FastAPI; React hooks taking a repository arg; abstract base classes or Protocols.

## Output format

After completing all five passes, produce:

```
## SOLID review summary

| Principle | Status   | Highest-impact issue                     |
| --------- | -------- | ---------------------------------------- |
| SRP       | ✓        | —                                        |
| OCP       | violation| `adapters/router.py:42` — switch on model_type |
| LSP       | ✓        | —                                        |
| ISP       | minor    | `domain/repo.py` — 6-method interface, callers use 1-2 |
| DIP       | violation| `service.py:18` — instantiates httpx directly |

## Findings

### OCP — violation
**Where**: `adapters/router.py:42-58`
**Why**: A `match model_type:` switch dispatches to four adapters. Adding a fifth requires editing this file *and* importing the new class here.
**Fix**: Introduce `AdapterRegistry` (Strategy + Registry). Each adapter declares its `supported_model_types`. Registration lives in a single `catalog.py`. The router asks the registry to resolve.

### DIP — violation
**Where**: `service.py:18`
**Why**: `ArchitectureService.__init__` creates its own `httpx.AsyncClient`, coupling service to concrete HTTP.
**Fix**: Accept `ConfigRepository` (Protocol) in `__init__`. Move HTTP-client construction to `api/dependencies.py`'s composition root.
...
```

End with a prioritized fix list — highest impact first.

## When to NOT flag

- "Violations" that would require a refactor disproportionate to current scope. Note them as minor concerns; don't push hard.
- Cases where the current code is correct and the user is mid-extraction (e.g., new file not yet wired up).
- Pure functions / value objects — many principles don't apply meaningfully to a `dataclass(frozen=True)`.
- Test code — test-specific shortcuts (long fixture functions, broad mocks) are acceptable.

## Reference: Aakar's canonical SOLID-compliant sites

These exist in this repo as concrete examples to point to in reviews:

- **SRP**: `backend/src/aakar_api/adapters/llama_family.py` — one file, one concern (Llama-family Spec construction). Helpers in `adapters/building/` are separate.
- **OCP**: `backend/src/aakar_api/adapters/catalog.py` — the only registration site; new adapters add lines here.
- **LSP**: `backend/src/aakar_api/adapters/base.py` — minimal `ArchitectureAdapter` interface; every concrete adapter is substitutable.
- **ISP**: `backend/src/aakar_api/application/interfaces.py` — `ConfigRepository` Protocol has exactly one method.
- **DIP**: `backend/src/aakar_api/application/architecture_service.py` — depends on abstractions (`ConfigRepository`, `AdapterRegistry`), not concretes.

Point reviewees here when they ask "what does compliance look like?"
