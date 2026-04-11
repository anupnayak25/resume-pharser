from __future__ import annotations

import re
from threading import Lock
from typing import List

from fastapi import HTTPException

from core.config import SPACY_MODEL
from services.text_utils import clean_text


_SPACY_NLP = None
_SPACY_LOCK = Lock()

_SKILLS_SECTION_RE = re.compile(r"\bskills\b\s*[:\n]", flags=re.I)


def spacy_nlp():
    global _SPACY_NLP
    if _SPACY_NLP is not None:
        return _SPACY_NLP

    try:
        import spacy
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"spaCy not installed or failed to import: {e}")

    with _SPACY_LOCK:
        if _SPACY_NLP is not None:
            return _SPACY_NLP
        try:
            _SPACY_NLP = spacy.load(SPACY_MODEL)
            return _SPACY_NLP
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=(
                    "spaCy model not available. Install one with: "
                    "python -m spacy download en_core_web_sm. "
                    f"(error: {e})"
                ),
            )


def extract_skill_phrases(text: str, max_phrases: int = 120) -> List[str]:
    t = text
    phrases: List[str] = []

    m = _SKILLS_SECTION_RE.search(t)
    if m:
        window = t[m.end() : m.end() + 2500]
        lines = [ln.strip(" \t•*-\r") for ln in window.splitlines()]
        for ln in lines:
            if not ln:
                continue
            if re.match(r"^[A-Z\s]{3,}$", ln):
                break
            for chunk in re.split(r"\s*,\s*", ln):
                chunk = clean_text(chunk)
                if 2 <= len(chunk) <= 60:
                    phrases.append(chunk)
            if len(phrases) >= max_phrases:
                break

    if phrases:
        return list(dict.fromkeys(phrases))[:max_phrases]

    nlp = spacy_nlp()
    doc = nlp(t[:20000])
    for chunk in doc.noun_chunks:
        phrase = clean_text(chunk.text)
        if 2 <= len(phrase) <= 60:
            phrases.append(phrase)
        if len(phrases) >= max_phrases:
            break

    return list(dict.fromkeys(phrases))[:max_phrases]
