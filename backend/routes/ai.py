"""Unified /api/ai/* Router — Strictly Authenticated & User-Scoped Hybrid AI Endpoints."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.auth import require_current_user
from backend.config import get_settings
from backend.insights.engine import generate_personalized_insights
from backend.llm.copilot import run_copilot_chat
from backend.ml.anomaly import detect_unusual_spending
from backend.ml.classifier import (
    CATEGORIES,
    CATEGORY_DISPLAY_MAP,
    classify_transaction,
    classify_transactions_batch,
    evaluate_classifier_benchmark,
)
from backend.ml.forecasting import forecast_monthly_expenses
from backend.rag.generator import answer_with_rag
from backend.rag.retriever import list_verified_sources
from backend.scenarios.simulator import run_conversational_scenario
from backend.services.data_access import UserDataAccess

router = APIRouter(prefix="/ai", tags=["Hybrid AI Financial Intelligence"])


class AIClassifyRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    category_hint: str = Field(default="", max_length=100)


class AIBatchClassifyItem(BaseModel):
    id: Optional[str] = None
    description: str = Field(..., min_length=1, max_length=500)
    category: Optional[str] = None


class AIBatchClassifyRequest(BaseModel):
    transactions: List[AIBatchClassifyItem] = Field(..., min_length=1, max_length=100)


class AICorrectCategoryRequest(BaseModel):
    transaction_id: str = Field(..., min_length=1, max_length=100)
    corrected_category: str = Field(..., min_length=1, max_length=100)
    predicted_category: Optional[str] = Field(default=None, max_length=100)
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    confirmed: bool = Field(
        default=False,
        description="Must be explicitly true after user confirmation in the UI.",
    )


class AIRagQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    top_k: int = Field(default=4, ge=1, le=6)
    similarity_threshold: Optional[float] = Field(default=None, ge=0.05, le=0.95)


class AICopilotChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1, max_length=2000)


class AIScenarioConverseRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=2000)
    baseline_income: Optional[float] = Field(default=None, ge=0)
    baseline_expenses: Optional[float] = Field(default=None, ge=0)


@router.get("/status")
async def ai_status(auth: Dict[str, str] = Depends(require_current_user)):
    settings = get_settings()
    return {
        "authenticated_user": auth["user_id"],
        "auth_engine": "fastapi_jwt_hs256",
        "database_engine": "sqlite",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "llm_configured": settings.is_llm_configured,
        "embedding_provider": settings.embedding_provider,
        "embedding_configured": settings.is_embedding_configured,
        "ml_categories": CATEGORIES,
        "ml_category_display_map": CATEGORY_DISPLAY_MAP,
    }


@router.post("/classify")
async def ai_classify(
    request: AIClassifyRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    corrections = da.get_category_corrections()
    return classify_transaction(
        description=request.description,
        category_hint=request.category_hint,
        user_corrections=corrections,
    )


@router.post("/classify/batch")
async def ai_classify_batch(
    request: AIBatchClassifyRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    corrections = da.get_category_corrections()
    predictions = classify_transactions_batch(
        items=[item.model_dump() for item in request.transactions],
        user_corrections=corrections,
    )
    return {
        "predictions": predictions,
        "user_corrections_applied": len(corrections),
    }


@router.get("/classify/evaluation")
async def ai_classify_evaluation(
    _auth: Dict[str, str] = Depends(require_current_user),
):
    return evaluate_classifier_benchmark()


@router.post("/categories/correct")
async def ai_correct_category(
    request: AICorrectCategoryRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    if not request.confirmed:
        raise HTTPException(
            status_code=400,
            detail="Explicit user confirmation (`confirmed=true`) is required before modifying a transaction category.",
        )
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    result = da.save_category_correction(
        transaction_id=request.transaction_id,
        corrected_category=request.corrected_category,
        predicted_category=request.predicted_category,
        confidence=request.confidence,
    )
    if not result.get("updated"):
        raise HTTPException(
            status_code=404,
            detail=result.get("error") or "Could not update transaction category.",
        )
    return {"confirmed": True, **result}


@router.get("/forecast")
async def ai_forecast(
    months: int = Query(default=3, ge=1, le=6),
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    transactions = da.get_transactions()
    return forecast_monthly_expenses(transactions=transactions, horizon_months=months)


@router.get("/anomalies")
async def ai_anomalies(auth: Dict[str, str] = Depends(require_current_user)):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    transactions = da.get_transactions()
    return detect_unusual_spending(transactions=transactions)


@router.get("/insights")
async def ai_insights(
    use_llm: bool = Query(default=False),
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    transactions = da.get_transactions()
    profile = da.get_profile() or {}
    budgets = da.get_budgets()
    goals = da.get_goals()
    forecast = forecast_monthly_expenses(transactions=transactions, horizon_months=3)
    anomalies = detect_unusual_spending(transactions=transactions)
    evaluation = evaluate_classifier_benchmark()

    result = generate_personalized_insights(
        profile=profile,
        transactions=transactions,
        budgets=budgets,
        goals=goals,
        forecast=forecast,
        anomalies=anomalies,
        use_llm=use_llm,
    )
    result["classification_evaluation"] = evaluation
    return result


@router.post("/rag/query")
async def ai_rag_query(
    request: AIRagQueryRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    return answer_with_rag(
        query=request.query,
        top_k=request.top_k,
        similarity_threshold=request.similarity_threshold,
        user_access_token=auth["access_token"],
    )


@router.get("/rag/sources")
async def ai_rag_sources(_auth: Dict[str, str] = Depends(require_current_user)):
    return {"sources": list_verified_sources()}


RAG_SAMPLE_QUESTIONS: List[str] = [
    "How are ELSS mutual funds taxed?",
    "What is expense ratio and exit load?",
    "RBI rules on UPI transaction disputes",
    "How does SIP rupee cost averaging work?",
    "How big should my emergency fund be?",
    "What are the NPS tax benefits and asset allocation choices?",
]


@router.get("/rag/status")
async def ai_rag_status(_auth: Dict[str, str] = Depends(require_current_user)):
    """RAG system status & indexed corpus panel data (engine, chunk counts, organizations, sample questions)."""
    from backend.rag.vector_store import LocalVectorStore

    settings = get_settings()
    store = LocalVectorStore()
    if store.count_chunks() == 0:
        store.ensure_seeded(compute_embeddings=False)
    chunks = store.get_all_chunks()
    embedded = sum(1 for c in chunks if c.get("embedding_json"))

    orgs: Dict[str, Dict[str, Any]] = {}
    for ch in chunks:
        org = str(ch.get("organization") or "Unknown")
        entry = orgs.setdefault(org, {"organization": org, "chunk_count": 0, "documents": []})
        entry["chunk_count"] += 1
        title = str(ch.get("source_title") or "")
        if title and title not in entry["documents"]:
            entry["documents"].append(title)

    dense = embedded > 0 and settings.is_embedding_configured
    return {
        "engine": "sqlite_numpy_cosine",
        "engine_label": "Local NumPy Vector Store (SQLite) + "
        + (f"{settings.llm_provider.title()} synthesis" if settings.is_llm_configured else "extractive answers (LLM not configured)"),
        "retrieval_mode": "dense_embeddings" if dense else "tfidf_fallback",
        "embedding_provider": settings.embedding_provider,
        "embedding_model": settings.embedding_model if dense else "TF-IDF (local fallback)",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "llm_configured": settings.is_llm_configured,
        "chunks_in_db": len(chunks),
        "embedded_chunks": embedded,
        "total_documents": len({c.get("source_title") for c in chunks}),
        "similarity_threshold": settings.rag_similarity_threshold,
        "organizations": sorted(orgs.values(), key=lambda o: o["organization"]),
        "sample_questions": RAG_SAMPLE_QUESTIONS,
        "ready": len(chunks) > 0,
    }


@router.post("/copilot/chat")
async def ai_copilot_chat(
    request: AICopilotChatRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    return run_copilot_chat(
        session_id=request.session_id,
        message=request.message,
        data_access=da,
        access_token=auth["access_token"],
    )


@router.post("/scenarios/converse")
async def ai_scenario_converse(
    request: AIScenarioConverseRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    transactions = da.get_transactions()
    profile = da.get_profile() or {}
    goals = da.get_goals()
    return run_conversational_scenario(
        message=request.message,
        transactions=transactions,
        profile=profile,
        goals=goals,
        override_baseline_income=request.baseline_income,
        override_baseline_expenses=request.baseline_expenses,
    )
