from __future__ import annotations

from datetime import datetime
from typing import List, Optional

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


class ScoreError(BaseModel):
    filename: str
    error: str


class ScoreResponse(BaseModel):
    job_name: Optional[str] = None
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
