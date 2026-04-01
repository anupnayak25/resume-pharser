from __future__ import annotations

from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def parse_iso(dt_str: str) -> datetime:
    return datetime.fromisoformat(dt_str)
