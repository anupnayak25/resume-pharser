from __future__ import annotations

import asyncio
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

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


@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: int,
    current_user=Depends(get_current_user),
) -> dict[str, bool]:
    deleted = await asyncio.to_thread(
        db_layer.delete_job,
        int(current_user["id"]),
        job_id,
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True}


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
                candidate_name=r.get("candidate_name"),
                score=float(r["score"]),
                similarity=float(r["similarity"]),
                skill_score=float(r["skill_score"]) if r["skill_score"] is not None else None,
                experience_score=float(r["experience_score"]) if r["experience_score"] is not None else None,
                extracted_years=float(r["extracted_years"]) if r["extracted_years"] is not None else None,
                created_at=parse_iso(r["created_at"]),
            )
        )
    return items


@router.delete("/history/{history_id}")
async def delete_history_item(
    history_id: int,
    current_user=Depends(get_current_user),
) -> dict[str, bool]:
    deleted = await asyncio.to_thread(
        db_layer.delete_history_item,
        int(current_user["id"]),
        history_id,
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="History item not found")
    return {"ok": True}


@router.get("/history/{history_id}/resume")
async def view_history_resume(
    history_id: int,
    current_user=Depends(get_current_user),
):
    doc = await asyncio.to_thread(
        db_layer.get_history_file,
        int(current_user["id"]),
        history_id,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Resume file not found")

    filename = str(doc.get("filename") or f"resume-{history_id}")
    content_type = str(doc.get("content_type") or "application/octet-stream")
    file_data = bytes(doc.get("file_data") or b"")

    headers = {"Content-Disposition": f'inline; filename="{filename}"'}
    return StreamingResponse(BytesIO(file_data), media_type=content_type, headers=headers)


@router.delete("/history")
async def delete_history(
    job_id: int | None = None,
    current_user=Depends(get_current_user),
) -> dict[str, int | bool]:
    if job_id is None:
        raise HTTPException(status_code=400, detail="job_id is required")

    deleted_count = await asyncio.to_thread(
        db_layer.delete_history,
        int(current_user["id"]),
        job_id,
    )
    return {"ok": True, "deleted_count": deleted_count}
