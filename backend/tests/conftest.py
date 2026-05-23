"""Shared pytest fixtures."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

_FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixture_dir() -> Path:
    return _FIXTURES_DIR


def _load_fixture(name: str) -> dict:
    with (_FIXTURES_DIR / f"{name}.json").open() as fp:
        return json.load(fp)


@pytest.fixture
def llama3_8b_config() -> dict:
    return _load_fixture("llama3_8b")


@pytest.fixture
def mistral_7b_config() -> dict:
    return _load_fixture("mistral_7b")


@pytest.fixture
def qwen2_7b_config() -> dict:
    return _load_fixture("qwen2_7b")


@pytest.fixture
def qwen3_06b_tied_config() -> dict:
    return _load_fixture("qwen3_06b_tied")
