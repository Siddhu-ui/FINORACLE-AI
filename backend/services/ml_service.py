"""Compatibility facade delegating to the modular backend.ml package."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from backend.ml.anomaly import detect_unusual_spending
from backend.ml.classifier import (
    classify_transaction as _classify_transaction,
    evaluate_classifier_benchmark,
)
from backend.ml.forecasting import forecast_monthly_expenses


def classify_transaction(
    description: str,
    category_hint: str = "",
    user_corrections: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    return _classify_transaction(
        description=description,
        category_hint=category_hint,
        user_corrections=user_corrections,
    )


def expense_forecast(transactions: List[Dict[str, Any]], months: int = 3) -> Dict[str, Any]:
    return forecast_monthly_expenses(transactions=transactions, horizon_months=months)


def classify_training_evaluation(_training_rows: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    return evaluate_classifier_benchmark()
