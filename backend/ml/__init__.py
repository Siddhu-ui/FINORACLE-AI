"""FinOracle AI Machine Learning Engine (Scikit-learn, Pandas, NumPy)."""
from backend.ml.classifier import (
    CATEGORIES,
    CATEGORY_DISPLAY_MAP,
    classify_transaction,
    classify_transactions_batch,
    evaluate_classifier_benchmark,
)
from backend.ml.forecasting import forecast_monthly_expenses
from backend.ml.anomaly import detect_unusual_spending

__all__ = [
    "CATEGORIES",
    "CATEGORY_DISPLAY_MAP",
    "classify_transaction",
    "classify_transactions_batch",
    "evaluate_classifier_benchmark",
    "forecast_monthly_expenses",
    "detect_unusual_spending",
]
