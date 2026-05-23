# Adding a new architecture

Aakar handles one model family per `ArchitectureAdapter`. v0.1 ships one (`LlamaFamilyAdapter`, covering `llama` / `mistral` / `qwen2` / `qwen3`) plus a `GenericAdapter` fallback for unknown types.

This guide walks through adding a brand-new architecture — Mixtral (MoE) is used as the running example. All file paths are in `backend/src/aakar_api/`.

## The contract

`adapters/base.py`:

```python
class ArchitectureAdapter(ABC):
    @property
    @abstractmethod
    def supported_model_types(self) -> tuple[str, ...]: ...

    @abstractmethod
    def build(self, config: ModelConfig, model_id: str) -> Spec: ...
```

Two methods. Pure function semantics: given a config + model ID, return a Spec.

## Step 1 — Create the adapter file

`adapters/mixtral.py`:

```python
from aakar_api.adapters.base import ArchitectureAdapter
from aakar_api.adapters.building import (
    BlockBuilder,
    embedding_params,
    gqa_attention_params,
    rmsnorm_params,
    lm_head_params,
)
from aakar_api.domain.model_config import ModelConfig
from aakar_api.domain.spec import Node, Spec


class MixtralAdapter(ArchitectureAdapter):
    """Mixtral / Mixture-of-Experts adapter.

    Same backbone as Llama (RMSNorm, GQA attention, residuals), but the FFN is
    replaced by a router + N expert FFNs.
    """

    @property
    def supported_model_types(self) -> tuple[str, ...]:
        return ("mixtral",)

    def build(self, config: ModelConfig, model_id: str) -> Spec:
        graph: list[Node] = [
            self._build_embedding(config),
            *[self._build_decoder_block(config, i) for i in range(config.num_hidden_layers)],
            self._build_final_norm(config),
            self._build_lm_head(config),
        ]
        return Spec(
            model_id=model_id,
            model_type=config.model_type,
            config_summary=self._summarize(config),
            graph=graph,
        )

    def _build_decoder_block(self, c: ModelConfig, idx: int) -> Node:
        # ... same as Llama, but the FFN child is replaced by an MoE block
        # using a new builder method `_build_moe(...)`.
        ...
```

The private builders (`_build_embedding`, `_build_decoder_block`, ...) are the adapter's own. Cross-cutting helpers (`BlockBuilder`, parameter formulas) live in `adapters/building/`.

## Step 2 — Add parameter formulas

If Mixtral needs formulas that don't exist yet, add them to `adapters/building/param_formulas.py`:

```python
def moe_router_params(hidden_size: int, num_experts: int) -> int:
    # Router is a single linear hidden_size → num_experts (logit per expert).
    return hidden_size * num_experts


def moe_expert_set_params(hidden_size: int, ffn_size: int, num_experts: int) -> int:
    # Each expert is a SwiGLU MLP; there are num_experts of them.
    return num_experts * 3 * hidden_size * ffn_size
```

Each formula gets a one-line comment explaining the math. This is the **study-repo angle** — the comments are for future-you reading the file.

## Step 3 — Wire into the catalog

`adapters/catalog.py` is the **only** place the system enumerates known adapters. Add one line:

```python
from aakar_api.adapters.mixtral import MixtralAdapter
# ...

def build_default_registry() -> AdapterRegistry:
    registry = AdapterRegistry(default=GenericAdapter())
    registry.register(LlamaFamilyAdapter())
    registry.register(MixtralAdapter())  # ← new
    return registry
```

No other file changes. The dispatcher in `application/architecture_service.py` resolves the new adapter automatically.

## Step 4 — Add a fixture + test

`tests/fixtures/mixtral_8x7b.json`:

```json
{
  "model_type": "mixtral",
  "hidden_size": 4096,
  "num_hidden_layers": 32,
  "num_attention_heads": 32,
  "num_key_value_heads": 8,
  "intermediate_size": 14336,
  "vocab_size": 32000,
  "num_local_experts": 8,
  "num_experts_per_tok": 2,
  "tie_word_embeddings": false
}
```

`tests/unit/test_mixtral_adapter.py`:

```python
def test_mixtral_8x7b_total_params_near_47b(mixtral_8x7b_config):
    spec = MixtralAdapter().build(ModelConfig(raw=mixtral_8x7b_config), "mistralai/Mixtral-8x7B")
    total = sum(n.param_count or 0 for n in spec.graph)
    assert 46e9 < total < 48e9
```

Run with `uv run pytest`. No edits to existing tests.

## Step 5 — Frontend (optional, only if you want custom rendering)

If Mixtral introduces a block type the frontend doesn't know how to render specially (e.g., `moe_router`), the generic renderer handles it gracefully — same card visual, just no domain-specific affordances.

To add a custom renderer for `moe_router`, see [`block-types.md`](./block-types.md).

## Done

That's the whole flow:
1. New file in `adapters/` (the adapter class).
2. New formulas in `adapters/building/param_formulas.py` if needed.
3. One line in `adapters/catalog.py`.
4. One fixture + one test.

Zero edits to existing adapters or the service layer (OCP).

## Adding to the `LlamaFamilyAdapter` instead

If a new `model_type` is structurally identical to Llama (e.g., a future Qwen variant), don't write a new adapter — just add the string to `LlamaFamilyAdapter.supported_model_types`. That's literally the case for `mistral`, `qwen2`, `qwen3`: all four share the same layout.
