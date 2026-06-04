"""Compose the in-process introspector with the sandbox as a fallback.

Decorator / chain-of-responsibility over two `Introspector`s:

  * The **primary** (in-process, `trust_remote_code=False`) handles the ~99% of
    models that are stock transformers — fast, and never runs foreign code.
  * Only when the primary raises `UnsupportedArchitecture` — *and* the operator
    has opted in via `allow_remote_code` — do we fall through to the **sandbox**.

If the sandbox also can't build the model (`IntrospectionFailed`), we surface
the *original* `UnsupportedArchitecture` so genuinely-unsupported models keep
their clear 422 rather than a confusing 502. A sandbox timeout propagates as-is.
When `allow_remote_code` is False this is a transparent pass-through — exactly
today's "refuse" behavior.
"""

from __future__ import annotations

from aakar_api.application.interfaces import Introspector
from aakar_api.domain.exceptions import IntrospectionFailed, UnsupportedArchitecture
from aakar_api.domain.spec import Spec


class FallbackIntrospector:
    """Try in-process first; fall back to the sandbox for remote-code models."""

    def __init__(
        self,
        primary: Introspector,
        sandbox: Introspector,
        *,
        allow_remote_code: bool,
    ) -> None:
        self._primary = primary
        self._sandbox = sandbox
        self._allow_remote_code = allow_remote_code

    async def fetch_config_hash(self, model_id: str, *, token: str | None = None) -> str:
        try:
            return await self._primary.fetch_config_hash(model_id, token=token)
        except UnsupportedArchitecture:
            if not self._allow_remote_code:
                raise
            # The sandbox runs fully offline with a scrubbed env — no token by
            # design, so gated + custom-code stays out of scope.
            return await self._sandbox.fetch_config_hash(model_id)

    async def introspect(self, model_id: str, *, token: str | None = None) -> Spec:
        try:
            return await self._primary.introspect(model_id, token=token)
        except UnsupportedArchitecture as primary_exc:
            if not self._allow_remote_code:
                raise
            try:
                return await self._sandbox.introspect(model_id)  # offline; token never forwarded
            except IntrospectionFailed:
                # The sandbox tried and couldn't — this model is genuinely
                # unsupported. Keep the original, clearer error (→ 422).
                raise primary_exc from None
