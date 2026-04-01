from __future__ import annotations

import re
from typing import Optional


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def detect_years(text: str) -> Optional[float]:
    matches = re.findall(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years|year|yrs|yr)\b", text, flags=re.I)
    if not matches:
        return None
    years = [float(m) for m in matches]
    return max(years) if years else None
