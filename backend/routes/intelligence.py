"""Legacy /api/intelligence/* endpoints delegating to unified ML & Insights modules."""
from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, Depends

from backend.auth import require_current_user
from backend.insights.engine import generate_personalized_insights
from backend.ml.anomaly import detect_unusual_spending
from backend.ml.classifier import classify_transaction, evaluate_classifier_benchmark
from backend.ml.forecasting import forecast_monthly_expenses
from backend.models.schemas import ClassifyRequest, CorrectCategoryRequest
from backend.services.data_access import UserDataAccess

router = APIRouter(prefix="/intelligence", tags=["AI Intelligence"])


@router.post("/classify")
async def classify(
    request: ClassifyRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    return classify_transaction(
        description=request.description,
        category_hint=request.category_hint,
        user_corrections=da.get_category_corrections(),
    )


@router.get("/insights")
async def insights(auth: Dict[str, str] = Depends(require_current_user)):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    transactions = da.get_transactions()
    profile = da.get_profile() or {}
    budgets = da.get_budgets()
    goals = da.get_goals()
    forecast = forecast_monthly_expenses(transactions)
    anomalies = detect_unusual_spending(transactions)
    result = generate_personalized_insights(
        profile=profile,
        transactions=transactions,
        budgets=budgets,
        goals=goals,
        forecast=forecast,
        anomalies=anomalies,
    )
    result["classification_evaluation"] = evaluate_classifier_benchmark()
    return result


@router.post("/categories/correct")
async def correct_category(
    request: CorrectCategoryRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    res = da.save_category_correction(request.transaction_id, request.category)
    return {"confirmed": bool(res.get("updated")), **res}
