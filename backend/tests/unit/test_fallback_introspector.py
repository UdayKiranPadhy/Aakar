"""Unit tests for `FallbackIntrospector` — the in-process → sandbox decision."""

from __future__ import annotations

import pytest

from aakar_api.domain.exceptions import (
    IntrospectionFailed,
    IntrospectionTimeout,
    ModelNotFound,
    UnsupportedArchitecture,
)
from aakar_api.domain.spec import Spec
from aakar_api.infrastructure.fallback_introspector import FallbackIntrospector

_STOCK = Spec(model_id="gpt2", model_type="gpt2", config_summary={}, graph=[])
_CUSTOM = Spec(model_id="org/custom", model_type="custom", config_summary={}, graph=[])


class StubIntrospector:
    """Returns a Spec, or raises a preset exception, recording its calls."""

    def __init__(self, *, spec: Spec | None = None, raises: Exception | None = None) -> None:
        self._spec = spec
        self._raises = raises
        self.introspect_calls: list[str] = []
        self.hash_calls: list[str] = []

    async def introspect(self, model_id: str) -> Spec:
        self.introspect_calls.append(model_id)
        if self._raises is not None:
            raise self._raises
        assert self._spec is not None
        return self._spec

    async def fetch_config_hash(self, model_id: str) -> str:
        self.hash_calls.append(model_id)
        if self._raises is not None:
            raise self._raises
        return "stub-hash"


async def test_primary_success_never_touches_sandbox() -> None:
    primary = StubIntrospector(spec=_STOCK)
    sandbox = StubIntrospector(spec=_CUSTOM)
    fb = FallbackIntrospector(primary, sandbox, allow_remote_code=True)
    assert await fb.introspect("gpt2") is _STOCK
    assert sandbox.introspect_calls == []


async def test_unsupported_falls_through_to_sandbox_when_allowed() -> None:
    primary = StubIntrospector(raises=UnsupportedArchitecture("org/custom", None))
    sandbox = StubIntrospector(spec=_CUSTOM)
    fb = FallbackIntrospector(primary, sandbox, allow_remote_code=True)
    assert await fb.introspect("org/custom") is _CUSTOM
    assert sandbox.introspect_calls == ["org/custom"]


async def test_unsupported_is_refused_when_not_allowed() -> None:
    primary = StubIntrospector(raises=UnsupportedArchitecture("org/custom", None))
    sandbox = StubIntrospector(spec=_CUSTOM)
    fb = FallbackIntrospector(primary, sandbox, allow_remote_code=False)
    with pytest.raises(UnsupportedArchitecture):
        await fb.introspect("org/custom")
    assert sandbox.introspect_calls == []  # sandbox never consulted


async def test_non_unsupported_errors_propagate_without_sandbox() -> None:
    # A ModelNotFound from the primary is a real answer — don't try the sandbox.
    primary = StubIntrospector(raises=ModelNotFound("ghost/model"))
    sandbox = StubIntrospector(spec=_CUSTOM)
    fb = FallbackIntrospector(primary, sandbox, allow_remote_code=True)
    with pytest.raises(ModelNotFound):
        await fb.introspect("ghost/model")
    assert sandbox.introspect_calls == []


async def test_sandbox_failure_surfaces_original_unsupported_error() -> None:
    original = UnsupportedArchitecture("org/custom", "WeirdModel")
    primary = StubIntrospector(raises=original)
    sandbox = StubIntrospector(raises=IntrospectionFailed("org/custom", "meta build failed"))
    fb = FallbackIntrospector(primary, sandbox, allow_remote_code=True)
    with pytest.raises(UnsupportedArchitecture) as ei:
        await fb.introspect("org/custom")
    # The clearer 422-mapped error wins over the sandbox's 502.
    assert ei.value is original


async def test_sandbox_timeout_propagates() -> None:
    primary = StubIntrospector(raises=UnsupportedArchitecture("org/custom", None))
    sandbox = StubIntrospector(raises=IntrospectionTimeout("org/custom"))
    fb = FallbackIntrospector(primary, sandbox, allow_remote_code=True)
    with pytest.raises(IntrospectionTimeout):
        await fb.introspect("org/custom")


async def test_config_hash_falls_through_to_sandbox_when_allowed() -> None:
    primary = StubIntrospector(raises=UnsupportedArchitecture("org/custom", None))
    sandbox = StubIntrospector(spec=_CUSTOM)
    fb = FallbackIntrospector(primary, sandbox, allow_remote_code=True)
    assert await fb.fetch_config_hash("org/custom") == "stub-hash"
    assert sandbox.hash_calls == ["org/custom"]
