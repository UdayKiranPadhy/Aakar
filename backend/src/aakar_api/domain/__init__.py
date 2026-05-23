"""Domain layer — pure types and value objects. No I/O, no framework dependencies."""

from aakar_api.domain.exceptions import (
    AakarDomainError,
    ModelGated,
    ModelNotFound,
    UnsupportedArchitecture,
)
from aakar_api.domain.spec import Node, Spec

__all__ = [
    "AakarDomainError",
    "ModelGated",
    "ModelNotFound",
    "Node",
    "Spec",
    "UnsupportedArchitecture",
]
