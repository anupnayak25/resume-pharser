from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException

from backend.core import db as db_layer
from backend.core.security import hash_password, token_for_user_id, verify_password, get_current_user
from backend.core.time import parse_iso
from backend.schemas import LoginRequest, SignupRequest, TokenResponse, UserResponse


router = APIRouter(tags=["auth"])


@router.post("/signup", response_model=UserResponse)
async def signup(payload: SignupRequest) -> UserResponse:
    password_hash = await asyncio.to_thread(hash_password, payload.password)
    user = await asyncio.to_thread(db_layer.create_user, payload.email, password_hash)
    return UserResponse(id=int(user["id"]), email=user["email"], created_at=parse_iso(user["created_at"]))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> TokenResponse:
    user = await asyncio.to_thread(db_layer.get_user_by_email, payload.email)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    ok = await asyncio.to_thread(verify_password, payload.password, user["password_hash"])
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = token_for_user_id(int(user["id"]))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(current_user=Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=int(current_user["id"]),
        email=current_user["email"],
        created_at=parse_iso(current_user["created_at"]),
    )
