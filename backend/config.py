"""Centralized backend configuration loaded from root .env (Self-Contained SQLite + FastAPI JWT + Gemini/OpenAI)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(ENV_PATH, override=False)

DEFAULT_DB_PATH = ROOT_DIR / "backend" / "data" / "finoracle.db"


def describe_key_format(key: str) -> str:
    if not key:
        return "unset"
    if key.startswith("AIza"):
        return "google_ai_studio"
    if key.startswith("AQ."):
        return "vertex_express_or_gcp"
    if key.startswith("sk-"):
        return "openai_sk"
    return "configured"


@dataclass(frozen=True)
class Settings:
    env_file_loaded: bool
    db_path: Path
    jwt_secret: str
    jwt_expire_hours: int
    llm_provider: str
    llm_api_key: str
    llm_model: str
    embedding_provider: str
    embedding_api_key: str
    embedding_model: str
    rag_similarity_threshold: float
    cors_origins: List[str]

    @property
    def is_llm_configured(self) -> bool:
        return bool(self.llm_api_key and self.llm_provider in {"gemini", "openai"})

    @property
    def is_embedding_configured(self) -> bool:
        return bool(self.embedding_api_key and self.embedding_provider in {"gemini", "openai"})


def get_settings() -> Settings:
    if ENV_PATH.exists():
        load_dotenv(ENV_PATH, override=False)

    db_env = (os.getenv("FINORACLE_DB_PATH") or "").strip()
    db_path = Path(db_env) if db_env else DEFAULT_DB_PATH

    jwt_secret = (os.getenv("JWT_SECRET") or "").strip() or "finoracle-local-dev-jwt-secret-change-in-prod"
    try:
        jwt_expire_hours = max(1, int(os.getenv("JWT_EXPIRE_HOURS") or "168"))
    except ValueError:
        jwt_expire_hours = 168

    provider = (os.getenv("LLM_PROVIDER") or "gemini").strip().lower()
    if provider not in {"gemini", "openai"}:
        provider = "gemini"

    if provider == "gemini":
        llm_key = (os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY") or "").strip()
        default_model = "gemini-2.5-flash"
        llm_model = (os.getenv("LLM_MODEL") or os.getenv("GEMINI_MODEL") or default_model).strip()
    else:
        llm_key = (os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY") or "").strip()
        default_model = "gpt-4o-mini"
        llm_model = (os.getenv("LLM_MODEL") or default_model).strip()

    emb_provider = (os.getenv("EMBEDDING_PROVIDER") or provider).strip().lower()
    if emb_provider not in {"gemini", "openai"}:
        emb_provider = provider

    if emb_provider == "gemini":
        emb_key = (os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY") or "").strip()
        default_emb_model = "gemini-embedding-001"
    else:
        emb_key = (os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY") or "").strip()
        default_emb_model = "text-embedding-3-small"

    emb_model = (os.getenv("EMBEDDING_MODEL") or default_emb_model).strip()

    if "YOUR_" in llm_key:
        llm_key = ""
    if "YOUR_" in emb_key:
        emb_key = ""

    try:
        threshold = float(os.getenv("RAG_SIMILARITY_THRESHOLD") or "0.35")
    except ValueError:
        threshold = 0.35

    origin_set: List[str] = []
    defaults = ["http://localhost:5173", "http://127.0.0.1:5173"]
    raw_origins = os.getenv("CORS_ORIGINS") or ""
    frontend_url = (os.getenv("FRONTEND_URL") or "").strip().rstrip("/")

    for candidate in (
        defaults
        + [o.strip().rstrip("/") for o in raw_origins.split(",") if o.strip()]
        + ([frontend_url] if frontend_url else [])
    ):
        if candidate and candidate not in origin_set:
            origin_set.append(candidate)

    return Settings(
        env_file_loaded=ENV_PATH.exists(),
        db_path=db_path,
        jwt_secret=jwt_secret,
        jwt_expire_hours=jwt_expire_hours,
        llm_provider=provider,
        llm_api_key=llm_key,
        llm_model=llm_model,
        embedding_provider=emb_provider,
        embedding_api_key=emb_key,
        embedding_model=emb_model,
        rag_similarity_threshold=max(0.05, min(0.95, threshold)),
        cors_origins=origin_set,
    )
