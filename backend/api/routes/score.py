from __future__ import annotations

import asyncio
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from core import db as db_layer
from core.config import JWT_ALGORITHM, JWT_SECRET_KEY, MAX_FILES_PER_REQUEST, MIN_ACCEPT_SCORE, PROCESS_CONCURRENCY
from core.progress import broker
from core.security import get_current_user
from schemas import ScoreError, ScoreItem, ScoreQuota, ScoreResponse
from services.scoring import score_resume_against_jd
from services.text_extraction import extract_and_clean_text


router = APIRouter(tags=["scoring"])


@router.websocket("/ws/progress/{scan_id}")
async def progress_ws(websocket: WebSocket, scan_id: str) -> None:
    await websocket.accept()

    user_id: int | None = None

    def _user_id_from_token(token: str) -> int:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            raise ValueError("missing sub")
        return int(sub)

    # Backward-compatible: allow token in query string.
    token_qs = websocket.query_params.get("token")
    if token_qs:
        try:
            user_id = _user_id_from_token(token_qs)
        except Exception:
            user_id = None

    # Preferred: client sends auth message after connect.
    if user_id is None:
        try:
            await websocket.send_json({"type": "auth_required"})
            msg = await asyncio.wait_for(websocket.receive_json(), timeout=10)
        except asyncio.TimeoutError:
            try:
                await websocket.send_json({"type": "error", "message": "Auth timeout"})
                await websocket.close(code=1008)
            except:
                pass
            return
        except Exception as e:
            try:
                await websocket.send_json({"type": "error", "message": f"Connection error: {str(e)}"})
                await websocket.close(code=1008)
            except:
                pass
            return

        if not isinstance(msg, dict) or msg.get("type") != "auth" or not msg.get("token"):
            try:
                await websocket.send_json({"type": "error", "message": "Invalid auth message"})
                await websocket.close(code=1008)
            except:
                pass
            return

        try:
            user_id = _user_id_from_token(str(msg.get("token")))
        except (JWTError, ValueError):
            try:
                await websocket.send_json({"type": "error", "message": "Invalid token"})
                await websocket.close(code=1008)
            except:
                pass
            return
    
    await broker.connect(user_id, scan_id, websocket)
    try:
        # Keep the socket open; client doesn't need to send messages.
        while True:
            try:
                msg = await websocket.receive()
            except Exception as e:
                raise
    except WebSocketDisconnect:
        pass
    except Exception as e:
        pass
    finally:
        await broker.disconnect(user_id, scan_id, websocket)


@router.post("/check-score", response_model=ScoreResponse)
async def check_score(
    resumes: List[UploadFile] = File(..., description="Upload 1-1000 resume files"),
    jd_text: str = Form(..., description="Job description as text"),
    job_name: Optional[str] = Form(None),
    scan_id: Optional[str] = Form(None, description="Client-generated id for progress updates"),
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

    job = await asyncio.to_thread(db_layer.get_or_create_job, int(current_user["id"]), job_name, jd_text)
    job_id = int(job["id"])

    user_id = int(current_user["id"])
    scan_key = scan_id.strip() if scan_id and scan_id.strip() else None
    total = len(file_blobs)
    processed = 0
    processed_lock = asyncio.Lock()

    async def push(event: dict) -> None:
        if scan_key is None:
            return
        await broker.broadcast(user_id, scan_key, event)

    await push({"type": "start", "total": total})

    async def process_one(filename: str, content_type: Optional[str], data: bytes) -> ScoreItem:
        extracted = await asyncio.to_thread(extract_and_clean_text, filename, content_type, data)
        if not extracted:
            raise HTTPException(status_code=422, detail=f"No text extracted from {filename}")

        scores = await asyncio.to_thread(score_resume_against_jd, extracted, jd_text)
        item = ScoreItem(filename=filename, **scores)

        await asyncio.to_thread(
            db_layer.save_history,
            int(current_user["id"]),
            job_id,
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
        nonlocal processed
        async with semaphore:
            try:
                return await process_one(filename, content_type, data)
            finally:
                async with processed_lock:
                    processed += 1
                    pct = int(round((processed / total) * 100)) if total else 100
                await push(
                    {
                        "type": "progress",
                        "processed": processed,
                        "total": total,
                        "percent": pct,
                        "filename": filename,
                    }
                )

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
        await push({"type": "error", "message": "No resumes processed successfully", "errors": [e.model_dump() for e in errors]})
        raise HTTPException(
            status_code=422,
            detail={"message": "No resumes processed successfully", "errors": [e.model_dump() for e in errors]},
        )

    results_sorted = sorted(results, key=lambda r: r.score, reverse=True)

    quota = ScoreQuota(min_overall_score=MIN_ACCEPT_SCORE)
    min_pct = int(round(MIN_ACCEPT_SCORE * 100))
    enriched: List[ScoreItem] = []
    for item in results_sorted:
        if item.score >= MIN_ACCEPT_SCORE:
            item.status = "accepted"
            item.rejection_reason = None
        else:
            item.status = "rejected"
            pct = int(round(item.score * 100))
            item.rejection_reason = f"Overall score {pct}% is below the required quota of {min_pct}%"
        enriched.append(item)

    await push({"type": "done", "percent": 100})
    return ScoreResponse(job_name=job_name, quota=quota, results=enriched, errors=errors)
