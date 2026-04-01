from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import List, Optional

from fastapi import HTTPException

from backend.core.config import DATABASE_PATH
from backend.core.time import utcnow


@contextmanager
def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                job_name TEXT,
                filename TEXT NOT NULL,
                score REAL NOT NULL,
                similarity REAL NOT NULL,
                skill_score REAL,
                experience_score REAL,
                extracted_years REAL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )


def get_user_by_email(email: str) -> Optional[sqlite3.Row]:
    with db() as conn:
        return conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()


def get_user_by_id(user_id: int) -> Optional[sqlite3.Row]:
    with db() as conn:
        return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


def create_user(email: str, password_hash: str) -> sqlite3.Row:
    email_norm = email.lower()
    created_at = utcnow().isoformat()
    with db() as conn:
        try:
            conn.execute(
                "INSERT INTO users(email, password_hash, created_at) VALUES(?,?,?)",
                (email_norm, password_hash, created_at),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Email already exists")
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email_norm,)).fetchone()
        assert row is not None
        return row


def save_history(
    user_id: int,
    job_name: Optional[str],
    filename: str,
    score: float,
    similarity: float,
    skill_score: Optional[float],
    experience_score: Optional[float],
    extracted_years: Optional[float],
) -> None:
    created_at = utcnow().isoformat()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO history(user_id, job_name, filename, score, similarity, skill_score, experience_score, extracted_years, created_at)
            VALUES(?,?,?,?,?,?,?,?,?)
            """,
            (
                user_id,
                job_name,
                filename,
                float(score),
                float(similarity),
                float(skill_score) if skill_score is not None else None,
                float(experience_score) if experience_score is not None else None,
                float(extracted_years) if extracted_years is not None else None,
                created_at,
            ),
        )


def list_history(user_id: int, limit: int, offset: int) -> List[sqlite3.Row]:
    with db() as conn:
        return conn.execute(
            """
            SELECT * FROM history
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (user_id, limit, offset),
        ).fetchall()
