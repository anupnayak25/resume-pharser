from __future__ import annotations

import os
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import auth, history, score
from backend.core.config import APP_NAME, CORS_ALLOW_CREDENTIALS, CORS_ALLOW_ORIGINS
from backend.core.db import init_db


def create_app() -> FastAPI:
    app = FastAPI(title=APP_NAME)

    cors_origins = [o.strip() for o in CORS_ALLOW_ORIGINS.split(",") if o.strip()]
    allow_credentials = CORS_ALLOW_CREDENTIALS
    if "*" in cors_origins:
        allow_credentials = False

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def _startup() -> None:
        init_db()

    @app.get("/health")
    def health() -> Dict[str, str]:
        return {"status": "ok"}

    @app.get("/version")
    def version() -> Dict[str, Any]:
        import time

        return {"name": APP_NAME, "time": int(time.time())}

    app.include_router(auth.router)
    app.include_router(score.router)
    app.include_router(history.router)

    return app
