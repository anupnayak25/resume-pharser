from __future__ import annotations

import asyncio
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from backend.core import db as db_layer
from backend.core.config import MAX_FILES_PER_REQUEST, PROCESS_CONCURRENCY
from backend.core.security import get_current_user
from backend.schemas import ScoreError, ScoreItem, ScoreResponse
from backend.services.scoring import score_resume_against_jd
from backend.services.text_extraction import extract_and_clean_text


router = APIRouter(tags=["scoring"])


@router.post("/check-score", response_model=ScoreResponse)
async def check_score(
    resumes: List[UploadFile] = File(..., description="Upload 1-1000 resume files"),
    jd_text: str = Form(..., description="Job description as text"),
    job_name: Optional[str] = Form(None),
    current_user=Depends(get_current_user),
) -> ScoreResponse:
    if not resumes:
        raise HTTPException(status_code=422, detail="No resume files uploaded")
    if len(resumes) > MAX_FILES_PER_REQUEST:
        raise HTTPException(status_code=413, detail=f"Too many files; max is {MAX_FILES_PER_REQUEST}")

    file_blobs: List[Tuple[str, Optional[str], bytes]] = []
    for f in resumes:
        data = await f.read()
        if not data:
            continue
        file_blobs.append((f.filename or "resume", f.content_type, data))

    if not file_blobs:
        raise HTTPException(status_code=422, detail="All uploaded files were empty")

    async def process_one(filename: str, content_type: Optional[str], data: bytes) -> ScoreItem:
        extracted = await asyncio.to_thread(extract_and_clean_text, filename, content_type, data)
        if not extracted:
            raise HTTPException(status_code=422, detail=f"No text extracted from {filename}")

        scores = await asyncio.to_thread(score_resume_against_jd, extracted, jd_text)
        item = ScoreItem(filename=filename, **scores)

        await asyncio.to_thread(
            db_layer.save_history,
            int(current_user["id"]),
            job_name,
            filename,
            item.score,
            item.similarity,
            item.skill_score,
            item.experience_score,
            item.extracted_years,
        )

        return item

    semaphore = asyncio.Semaphore(PROCESS_CONCURRENCY)

    async def guarded(filename: str, content_type: Optional[str], data: bytes) -> ScoreItem:
        async with semaphore:
            return await process_one(filename, content_type, data)

    tasks = [guarded(fn, ct, blob) for fn, ct, blob in file_blobs]
    gathered = await asyncio.gather(*tasks, return_exceptions=True)

    results: List[ScoreItem] = []
    errors: List[ScoreError] = []
    for (fn, _, _), item in zip(file_blobs, gathered):
        if isinstance(item, Exception):
            detail = str(item)
            if isinstance(item, HTTPException):
                detail = str(item.detail)
            errors.append(ScoreError(filename=fn, error=detail))
            continue
        results.append(item)

    if not results:
        raise HTTPException(
            status_code=422,
            detail={"message": "No resumes processed successfully", "errors": [e.model_dump() for e in errors]},
        )

    results_sorted = sorted(results, key=lambda r: r.score, reverse=True)
    return ScoreResponse(job_name=job_name, results=results_sorted, errors=errors)
