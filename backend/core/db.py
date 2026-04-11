from __future__ import annotations

import hashlib
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from pymongo import MongoClient, ReturnDocument
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import ConfigurationError, DuplicateKeyError
from pymongo.operations import IndexModel

from core.config import MONGO_DB_NAME, MONGO_URI
from core.time import utcnow


_CLIENT: MongoClient | None = None


def _client() -> MongoClient:
    global _CLIENT
    if _CLIENT is None:
        try:
            _CLIENT = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        except ConfigurationError as exc:
            raise RuntimeError(
                "Invalid MONGO_URI configuration. Verify it has no empty host, trailing comma, or surrounding whitespace."
            ) from exc
    return _CLIENT


def _db() -> Database:
    return _client()[MONGO_DB_NAME]


def _col(name: str) -> Collection:
    return _db()[name]


def _normalize_jd_text(jd_text: str) -> str:
    # Normalize for hashing/grouping only.
    return " ".join((jd_text or "").strip().lower().split())


def jd_hash_for_text(jd_text: str) -> str:
    normalized = _normalize_jd_text(jd_text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _next_id(sequence: str) -> int:
    counters = _col("counters")
    doc = counters.find_one_and_update(
        {"_id": sequence},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    value = doc.get("value") if doc else None
    if value is None:
        doc = counters.find_one({"_id": sequence}) or {}
        value = doc.get("value")
    if value is None:
        raise HTTPException(status_code=500, detail="Failed to allocate id")
    return int(value)


def init_db() -> None:
    # Verify connectivity and ensure indexes exist.
    database = _db()
    database.command("ping")

    users = database["users"]
    jobs = database["jobs"]
    history = database["history"]

    users.create_indexes([IndexModel([("email", 1)], unique=True, name="uniq_email")])

    jobs.create_indexes(
        [
            IndexModel([("user_id", 1), ("jd_hash", 1)], unique=True, name="uniq_user_jd"),
            IndexModel([("user_id", 1), ("created_at", -1)], name="jobs_user_created"),
        ]
    )

    history.create_indexes(
        [
            IndexModel([("user_id", 1), ("id", -1)], name="hist_user_id_desc"),
            IndexModel([("user_id", 1), ("job_id", 1), ("id", -1)], name="hist_user_job_id_desc"),
            IndexModel([("job_id", 1)], name="hist_job"),
        ]
    )


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    email_norm = (email or "").lower()
    return _col("users").find_one({"email": email_norm}, {"_id": 0})


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    return _col("users").find_one({"id": int(user_id)}, {"_id": 0})


def create_user(email: str, password_hash: str) -> Dict[str, Any]:
    email_norm = (email or "").lower()
    created_at = utcnow().isoformat()
    user_doc = {
        "id": _next_id("users"),
        "email": email_norm,
        "password_hash": password_hash,
        "created_at": created_at,
    }
    try:
        _col("users").insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email already exists")

    return {k: v for k, v in user_doc.items() if k != "_id"}


def get_or_create_job(user_id: int, job_name: Optional[str], jd_text: str) -> Dict[str, Any]:
    if not jd_text or not jd_text.strip():
        raise HTTPException(status_code=422, detail="Empty job description")

    jd_hash = jd_hash_for_text(jd_text)
    jobs = _col("jobs")

    row = jobs.find_one({"user_id": int(user_id), "jd_hash": jd_hash}, {"_id": 0})
    if row is not None:
        if job_name and not row.get("job_name"):
            jobs.update_one({"id": int(row["id"])}, {"$set": {"job_name": job_name}})
            row = jobs.find_one({"id": int(row["id"])}, {"_id": 0})
        assert row is not None
        return row

    created_at = utcnow().isoformat()
    job_doc = {
        "id": _next_id("jobs"),
        "user_id": int(user_id),
        "job_name": job_name,
        "jd_hash": jd_hash,
        "jd_text": jd_text,
        "created_at": created_at,
    }

    try:
        jobs.insert_one(job_doc)
    except DuplicateKeyError:
        # Race: someone else created it.
        existing = jobs.find_one({"user_id": int(user_id), "jd_hash": jd_hash}, {"_id": 0})
        if existing is not None:
            return existing
        raise

    return {k: v for k, v in job_doc.items() if k != "_id"}


def save_history(
    user_id: int,
    job_id: Optional[int],
    job_name: Optional[str],
    filename: str,
    score: float,
    similarity: float,
    skill_score: Optional[float],
    experience_score: Optional[float],
    extracted_years: Optional[float],
) -> None:
    created_at = utcnow().isoformat()
    history_doc = {
        "id": _next_id("history"),
        "user_id": int(user_id),
        "job_id": int(job_id) if job_id is not None else None,
        "job_name": job_name,
        "filename": filename,
        "score": float(score),
        "similarity": float(similarity),
        "skill_score": float(skill_score) if skill_score is not None else None,
        "experience_score": float(experience_score) if experience_score is not None else None,
        "extracted_years": float(extracted_years) if extracted_years is not None else None,
        "created_at": created_at,
    }
    _col("history").insert_one(history_doc)


def list_history(user_id: int, limit: int, offset: int) -> List[Dict[str, Any]]:
    return list_history_for_job(user_id=user_id, job_id=None, limit=limit, offset=offset)


def list_history_for_job(user_id: int, job_id: Optional[int], limit: int, offset: int) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {"user_id": int(user_id)}
    if job_id is not None:
        query["job_id"] = int(job_id)

    cursor = (
        _col("history")
        .find(query, {"_id": 0})
        .sort([("id", -1)])
        .skip(int(offset))
        .limit(int(limit))
    )
    return list(cursor)


def list_jobs(user_id: int, limit: int, offset: int) -> List[Dict[str, Any]]:
    pipeline: List[Dict[str, Any]] = [
        {"$match": {"user_id": int(user_id)}},
        {
            "$lookup": {
                "from": "history",
                "let": {"job_id": "$id", "u": "$user_id"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$job_id", "$$job_id"]},
                                    {"$eq": ["$user_id", "$$u"]},
                                ]
                            }
                        }
                    },
                    {"$project": {"_id": 0, "score": 1, "created_at": 1}},
                ],
                "as": "scans",
            }
        },
        {
            "$addFields": {
                "total_scans": {"$size": "$scans"},
                "avg_score": {"$avg": "$scans.score"},
                "best_score": {"$max": "$scans.score"},
                "last_scanned_at": {"$max": "$scans.created_at"},
            }
        },
        {
            "$addFields": {
                "sort_key": {"$ifNull": ["$last_scanned_at", "$created_at"]}
            }
        },
        {"$sort": {"sort_key": -1}},
        {"$skip": int(offset)},
        {"$limit": int(limit)},
        {
            "$project": {
                "_id": 0,
                "id": 1,
                "user_id": 1,
                "job_name": 1,
                "jd_hash": 1,
                "jd_text": 1,
                "created_at": 1,
                "total_scans": 1,
                "avg_score": 1,
                "best_score": 1,
                "last_scanned_at": 1,
            }
        },
    ]

    return list(_col("jobs").aggregate(pipeline))
