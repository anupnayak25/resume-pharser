from __future__ import annotations

import os
from pathlib import Path


def _load_local_env_file() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        if key:
            os.environ.setdefault(key, value)


_load_local_env_file()


APP_NAME = "resume-pharser"


def _env_str(name: str, default: str) -> str:
    return (os.getenv(name, default) or "").strip()

DATABASE_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "..", "app.db"))

# MongoDB (persistence)
MONGO_URI = _env_str("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = _env_str("MONGO_DB_NAME", "resume_pharser")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))

MAX_FILES_PER_REQUEST = int(os.getenv("MAX_FILES_PER_REQUEST", "1000"))
PROCESS_CONCURRENCY = int(os.getenv("PROCESS_CONCURRENCY", "4"))

# Minimum overall match score required for a resume to be considered not rejected.
# Expressed as a 0..1 float.
MIN_ACCEPT_SCORE = float(os.getenv("MIN_ACCEPT_SCORE", "0.45"))

CORS_ALLOW_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS", "*")
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"

SPACY_MODEL = os.getenv("SPACY_MODEL", "en_core_web_sm")
SBERT_MODEL = os.getenv("SBERT_MODEL", "all-MiniLM-L6-v2")
