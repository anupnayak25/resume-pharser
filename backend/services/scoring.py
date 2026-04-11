from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

from services.embeddings import cosine_similarity_matrix, embed_texts
from services.nlp import extract_skill_phrases
from services.text_utils import clean_text, detect_years


def score_resume_against_jd(resume_text: str, jd_text: str) -> Dict[str, Any]:
    resume_text = clean_text(resume_text)
    jd_text = clean_text(jd_text)
    if not resume_text:
        raise HTTPException(status_code=422, detail="Empty resume text after extraction")
    if not jd_text:
        raise HTTPException(status_code=422, detail="Empty job description")

    embeddings = embed_texts([resume_text[:25000], jd_text[:25000]])
    base_sim_raw = float(cosine_similarity_matrix(embeddings[:1], embeddings[1:])[0][0])
    base_sim = max(0.0, min(1.0, (base_sim_raw + 1.0) / 2.0))

    resume_phrases = extract_skill_phrases(resume_text)
    jd_phrases = extract_skill_phrases(jd_text)

    skill_score: Optional[float] = None
    if resume_phrases and jd_phrases:
        combined = resume_phrases + jd_phrases
        phrase_embeddings = embed_texts(combined)
        resume_emb = phrase_embeddings[: len(resume_phrases)]
        jd_emb = phrase_embeddings[len(resume_phrases) :]
        sim = cosine_similarity_matrix(resume_emb, jd_emb)

        import numpy as np

        best = np.max(sim, axis=1)
        k = min(20, best.shape[0])
        topk = np.sort(best)[-k:]
        skill_score_raw = float(np.mean(topk))
        skill_score = max(0.0, min(1.0, (skill_score_raw + 1.0) / 2.0))

    resume_years = detect_years(resume_text)
    jd_years = detect_years(jd_text)
    experience_score: Optional[float] = None
    if resume_years is not None and jd_years is not None and jd_years > 0:
        ratio = min(1.0, resume_years / jd_years)
        experience_score = float(max(0.0, min(1.0, ratio)))

    weights = {
        "base": 0.65,
        "skill": 0.25,
        "exp": 0.10,
    }

    components: List[Tuple[float, float]] = [(base_sim, weights["base"])]
    if skill_score is not None:
        components.append((skill_score, weights["skill"]))
    if experience_score is not None:
        components.append((experience_score, weights["exp"]))

    weight_sum = sum(w for _, w in components) or 1.0
    final = sum(val * w for val, w in components) / weight_sum
    final = float(max(0.0, min(1.0, final)))

    return {
        "score": final,
        "similarity": base_sim,
        "skill_score": skill_score,
        "experience_score": experience_score,
        "extracted_years": resume_years,
    }
