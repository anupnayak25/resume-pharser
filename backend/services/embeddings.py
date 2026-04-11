from __future__ import annotations

from threading import Lock
from typing import List

from fastapi import HTTPException

from core.config import SBERT_MODEL


_SBERT_MODEL = None
_SBERT_LOCK = Lock()


def get_sbert_model():
    global _SBERT_MODEL
    if _SBERT_MODEL is not None:
        return _SBERT_MODEL

    try:
        from sentence_transformers import SentenceTransformer
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"sentence-transformers not installed or failed to import: {e}")

    with _SBERT_LOCK:
        if _SBERT_MODEL is None:
            _SBERT_MODEL = SentenceTransformer(SBERT_MODEL)

    return _SBERT_MODEL


def embed_texts(texts: List[str]):
    model = get_sbert_model()
    return model.encode(texts, normalize_embeddings=True)


def cosine_similarity_matrix(a, b):
    import numpy as np

    a = np.asarray(a)
    b = np.asarray(b)
    return a @ b.T
