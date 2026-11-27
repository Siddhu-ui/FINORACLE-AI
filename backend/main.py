"""FinOracle AI FastAPI Entrypoint — Self-Contained SQLite + FastAPI JWT + NumPy RAG + Gemini/OpenAI."""
from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict

_REPO_ROOT = str(Path(__file__).resolve().parent.parent)
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.config import describe_key_format, get_settings
from backend.db.database import get_db_path, init_db, list_tables
from backend.llm.provider import LLMNotConfiguredError, LLMProviderError, get_llm_provider
from backend.ml.classifier import CATEGORIES, load_benchmark_dataset
from backend.rag.vector_store import LocalVectorStore
from backend.routes import ai, assistant, auth_router, crud_router, intelligence, loans, scenarios

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # 1. Auto-initialize SQLite schema cleanly on startup
    init_db()
    # 2. Auto-seed curated authoritative Indian finance RAG knowledge if empty
    store = LocalVectorStore()
    store.ensure_seeded(compute_embeddings=get_settings().is_embedding_configured)
    yield


app = FastAPI(
    title="FinOracle AI Backend",
    version="3.0.0",
    description="Self-Contained Hybrid AI Financial Intelligence Platform (SQLite + FastAPI JWT + Scikit-learn ML + NumPy RAG + Gemini Copilot)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    # Allow local-network dev origins (e.g. http://192.168.x.x:5173 when opening the Vite "Network" URL)
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api")
app.include_router(crud_router.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(loans.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")
app.include_router(assistant.router, prefix="/api")
app.include_router(intelligence.router, prefix="/api")


def _build_health_payload(check_llm: bool = False) -> Dict[str, Any]:
    cfg = get_settings()
    init_db()

    # SQLite status
    try:
        tables = list_tables()
        db_status = {
            "engine": "sqlite",
            "path": str(get_db_path()),
            "ok": len(tables) >= 7,
            "tables": tables,
        }
    except Exception as exc:
        db_status = {"engine": "sqlite", "ok": False, "error": exc.__class__.__name__}

    # ML status
    try:
        ds = load_benchmark_dataset()
        ml_status = {
            "loaded": True,
            "categories_count": len(CATEGORIES),
            "benchmark_version": ds["metadata"]["version"],
            "benchmark_samples": len(ds["records"]),
        }
    except Exception as exc:
        ml_status = {"loaded": False, "error": exc.__class__.__name__}

    # Local SQLite + NumPy RAG status
    try:
        store = LocalVectorStore()
        total_chunks = store.count_chunks()
        if total_chunks == 0:
            store.ensure_seeded(compute_embeddings=False)
            total_chunks = store.count_chunks()
        embedded_chunks = store.count_embedded_chunks()
        rag_status = {
            "engine": "sqlite_numpy_cosine",
            "chunks_in_db": total_chunks,
            "embedded_chunks": embedded_chunks,
            "retrieval_mode": "sqlite_numpy_embeddings" if embedded_chunks > 0 else "sqlite_tfidf",
            "similarity_threshold": cfg.rag_similarity_threshold,
            "retrieval_ready": total_chunks > 0,
        }
    except Exception as exc:
        rag_status = {"retrieval_ready": False, "error": exc.__class__.__name__}

    # LLM status
    llm_status: Dict[str, Any] = {
        "provider": cfg.llm_provider,
        "model": cfg.llm_model,
        "configured": cfg.is_llm_configured,
        "key_format": describe_key_format(cfg.llm_api_key),
    }
    if check_llm:
        try:
            provider = get_llm_provider()
            reply = provider.generate_text(
                system_prompt="Reply with exactly OK.",
                user_prompt="Health ping",
                temperature=0.0,
            )
            llm_status["live_reachable"] = True
            llm_status["live_reply_preview"] = reply[:24]
        except (LLMNotConfiguredError, LLMProviderError) as exc:
            llm_status["live_reachable"] = False
            llm_status["live_error"] = str(exc)[:300]

    overall_healthy = bool(db_status.get("ok") and ml_status.get("loaded") and rag_status.get("retrieval_ready"))
    return {
        "status": "healthy" if overall_healthy else "degraded",
        "service": "FinOracle AI Self-Contained Hybrid Intelligence Engine",
        "version": "3.0.0",
        "env_file_loaded": cfg.env_file_loaded,
        "auth": {"engine": "fastapi_jwt_hs256", "ready": True},
        "database": db_status,
        "ml": ml_status,
        "rag": rag_status,
        "llm": llm_status,
        "llm_provider": cfg.llm_provider,
        "llm_configured": cfg.is_llm_configured,
    }


@app.get("/health")
async def root_health_check(check_llm: bool = Query(default=False)):
    return _build_health_payload(check_llm=check_llm)


@app.get("/api/health")
async def api_health_check(check_llm: bool = Query(default=False)):
    return _build_health_payload(check_llm=check_llm)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
