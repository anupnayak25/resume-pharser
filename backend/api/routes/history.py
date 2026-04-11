from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends

from core import db as db_layer
from core.security import get_current_user
from core.time import parse_iso
from schemas import HistoryItem, JobSummary


router = APIRouter(tags=["history"])


@router.get("/jobs", response_model=list[JobSummary])
async def jobs(
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
) -> list[JobSummary]:
    limit = max(1, min(200, limit))
    offset = max(0, offset)

    rows = await asyncio.to_thread(db_layer.list_jobs, int(current_user["id"]), limit, offset)
    items: list[JobSummary] = []
    for r in rows:
        items.append(
            JobSummary(
                id=int(r["id"]),
                job_name=r["job_name"],
                jd_hash=r["jd_hash"],
                jd_text=r.get("jd_text"),
                created_at=parse_iso(r["created_at"]),
                total_scans=int(r["total_scans"] or 0),
                avg_score=float(r["avg_score"]) if r["avg_score"] is not None else None,
                best_score=float(r["best_score"]) if r["best_score"] is not None else None,
                last_scanned_at=parse_iso(r["last_scanned_at"]) if r["last_scanned_at"] is not None else None,
            )
        )
    return items


@router.get("/history", response_model=list[HistoryItem])
async def history(
    limit: int = 50,
    offset: int = 0,
    job_id: int | None = None,
    current_user=Depends(get_current_user),
) -> list[HistoryItem]:
    limit = max(1, min(200, limit))
    offset = max(0, offset)

    rows = await asyncio.to_thread(
        db_layer.list_history_for_job,
        int(current_user["id"]),
        job_id,
        limit,
        offset,
    )
    items: list[HistoryItem] = []
    for r in rows:
        items.append(
            HistoryItem(
                id=int(r["id"]),
                job_name=r["job_name"],
                filename=r["filename"],
                score=float(r["score"]),
                similarity=float(r["similarity"]),
                skill_score=float(r["skill_score"]) if r["skill_score"] is not None else None,
                experience_score=float(r["experience_score"]) if r["experience_score"] is not None else None,
                extracted_years=float(r["extracted_years"]) if r["extracted_years"] is not None else None,
                created_at=parse_iso(r["created_at"]),
            )
        )
    return items
