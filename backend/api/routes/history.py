from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends

from backend.core import db as db_layer
from backend.core.security import get_current_user
from backend.core.time import parse_iso
from backend.schemas import HistoryItem


router = APIRouter(tags=["history"])


@router.get("/history", response_model=list[HistoryItem])
async def history(
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
) -> list[HistoryItem]:
    limit = max(1, min(200, limit))
    offset = max(0, offset)

    rows = await asyncio.to_thread(db_layer.list_history, int(current_user["id"]), limit, offset)
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
