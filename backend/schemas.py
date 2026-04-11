from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime


class ScoreItem(BaseModel):
    filename: str
    score: float
    similarity: float
    skill_score: Optional[float] = None
    experience_score: Optional[float] = None
    extracted_years: Optional[float] = None
    status: Optional[Literal["accepted", "rejected"]] = None
    rejection_reason: Optional[str] = None


class ScoreQuota(BaseModel):
    min_overall_score: float = Field(ge=0.0, le=1.0)


class ScoreError(BaseModel):
    filename: str
    error: str


class ScoreResponse(BaseModel):
    job_name: Optional[str] = None
    quota: Optional[ScoreQuota] = None
    results: List[ScoreItem]
    errors: List[ScoreError] = []


class HistoryItem(BaseModel):
    id: int
    job_name: Optional[str]
    filename: str
    score: float
    similarity: float
    skill_score: Optional[float]
    experience_score: Optional[float]
    extracted_years: Optional[float]
    created_at: datetime


class JobSummary(BaseModel):
    id: int
    job_name: Optional[str]
    jd_hash: str
    jd_text: Optional[str] = None
    created_at: datetime
    total_scans: int
    avg_score: Optional[float] = None
    best_score: Optional[float] = None
    last_scanned_at: Optional[datetime] = None
