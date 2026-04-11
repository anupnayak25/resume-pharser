from __future__ import annotations

import os


APP_NAME = "resume-pharser"

DATABASE_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "..", "app.db"))

# MongoDB (persistence)
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://MajroProjectFinalPhase:2uTx33HEBa6JTSXi@cluster0.gikpl8i.mongodb.net/?appName=Cluster0")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "resume_pharser")

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
