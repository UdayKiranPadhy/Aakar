"""Naming helpers for stable node IDs and readable labels."""

from __future__ import annotations

import re

_SNAKE_RE_1 = re.compile(r"(.)([A-Z][a-z]+)")
_SNAKE_RE_2 = re.compile(r"([a-z0-9])([A-Z])")


def snake_case(name: str) -> str:
    s = _SNAKE_RE_1.sub(r"\1_\2", name)
    return _SNAKE_RE_2.sub(r"\1_\2", s).lower()


def humanize(segment: str) -> str:
    if not segment:
        return segment
    if segment.isdigit():
        return f"Layer {segment}"
    parts = segment.split("_")
    parts[0] = parts[0].capitalize()
    return " ".join(parts)

