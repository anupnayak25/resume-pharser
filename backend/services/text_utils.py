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


def extract_candidate_name(text: str, fallback_filename: str) -> str:
    # Prefer short, title-like lines near the top of the resume.
    lines = [ln.strip() for ln in text.splitlines() if ln and ln.strip()]
    for ln in lines[:12]:
        if len(ln) < 2 or len(ln) > 60:
            continue
        if re.search(r"@|http|www\.|linkedin|github|phone|mobile|resume|curriculum", ln, flags=re.I):
            continue
        if re.search(r"\d", ln):
            continue
        if re.fullmatch(r"[A-Za-z][A-Za-z\s.'-]{1,58}[A-Za-z.]", ln):
            words = [w for w in ln.split() if w]
            if 2 <= len(words) <= 5:
                return " ".join(w.capitalize() for w in words)

    base = fallback_filename.rsplit(".", 1)[0]
    base = re.sub(r"[_\-.]+", " ", base).strip()
    return base or fallback_filename
