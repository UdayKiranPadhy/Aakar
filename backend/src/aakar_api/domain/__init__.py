"""Domain layer — pure types and value objects. No I/O, no framework dependencies."""

from aakar_api.domain.exceptions import (
    AakarDomainError,
    IntrospectionFailed,
    IntrospectionTimeout,
    ModelGated,
    ModelNotFound,
    UnsupportedArchitecture,
)
from aakar_api.domain.spec import Node, Spec

__all__ = [
    "AakarDomainError",
    "IntrospectionFailed",
    "IntrospectionTimeout",
    "ModelGated",
    "ModelNotFound",
    "Node",
    "Spec",
    "UnsupportedArchitecture",
]
