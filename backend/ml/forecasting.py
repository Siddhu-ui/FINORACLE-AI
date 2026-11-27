"""Expense Forecasting Engine with Chronological Validation & Uncertainty Bands.

Strictly uses the authenticated user's actual historical monthly expense aggregates.
Enforces the <3 full months insufficient_data guard (never extrapolates insufficient history).
"""
from __future__ import annotations

import calendar
import math
from collections import defaultdict
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.linear_model import Ridge

MIN_FULL_MONTHS = 3


def _add_months(year: int, month: int, offset: int) -> str:
    total = (year * 12 + (month - 1)) + offset
    new_y = total // 12
    new_m = (total % 12) + 1
    return f"{new_y:04d}-{new_m:02d}"


def _build_features(indices: np.ndarray, months_of_year: List[int], use_seasonality: bool) -> np.ndarray:
    t = indices.reshape(-1, 1)
    if not use_seasonality:
        return t
    rad = np.array([2.0 * math.pi * m / 12.0 for m in months_of_year]).reshape(-1, 1)
    return np.hstack([t, np.sin(rad), np.cos(rad)])


def forecast_monthly_expenses(
    transactions: List[Dict[str, Any]],
    horizon_months: int = 3,
    reference_date: Optional[date] = None,
) -> Dict[str, Any]:
    """Forecast next-month and multi-month expenses from chronological monthly aggregates."""
    ref = reference_date or date.today()
    current_ym = ref.strftime("%Y-%m")
    days_in_current = calendar.monthrange(ref.year, ref.month)[1]
    is_current_month_complete = ref.day >= days_in_current

    monthly_totals: Dict[str, float] = defaultdict(float)
    monthly_counts: Dict[str, int] = defaultdict(int)

    for tx in transactions:
        if str(tx.get("type") or "").lower() != "expense":
            continue
        ym = str(tx.get("date") or "")[:7]
        if len(ym) != 7 or ym[4] != "-":
            continue
        amount = float(tx.get("amount") or 0.0)
        if amount <= 0:
            continue
        monthly_totals[ym] += amount
        monthly_counts[ym] += 1

    all_sorted_months = sorted(monthly_totals.keys())

    # Separate completed full months from an in-progress current month
    full_months: List[str] = []
    partial_current_month: Optional[Dict[str, Any]] = None
    for ym in all_sorted_months:
        if ym == current_ym and not is_current_month_complete:
            partial_current_month = {
                "month": ym,
                "actual_expense": round(monthly_totals[ym], 2),
                "transaction_count": monthly_counts[ym],
                "is_partial": True,
            }
        else:
            full_months.append(ym)

    historical_full = [
        {
            "month": ym,
            "actual_expense": round(monthly_totals[ym], 2),
            "transaction_count": monthly_counts[ym],
            "is_partial": False,
        }
        for ym in full_months
    ]

    if len(full_months) < MIN_FULL_MONTHS:
        months_needed = MIN_FULL_MONTHS - len(full_months)
        return {
            "status": "insufficient_data",
            "available": False,
            "months_available": len(full_months),
            "months_required": MIN_FULL_MONTHS,
            "months_needed": months_needed,
            "reason": (
                f"Expense forecasting requires at least {MIN_FULL_MONTHS} full months of expense history. "
                f"You currently have {len(full_months)} full month(s); record {months_needed} more full month(s) "
                "before predictions can be generated."
            ),
            "partial_current_month": partial_current_month,
            "historical": historical_full,
            "predictions": [],
            "chart_series": [
                {
                    "month": row["month"],
                    "actual": row["actual_expense"],
                    "predicted": None,
                    "lower_bound": None,
                    "upper_bound": None,
                }
                for row in historical_full
            ],
            "metrics": {"mae": None, "rmse": None, "validation_split": None},
        }

    y = np.array([monthly_totals[m] for m in full_months], dtype=float)
    n = len(y)
    idx = np.arange(n, dtype=float)
    moy = [int(m.split("-")[1]) for m in full_months]
    use_seasonality = n >= 6

    # Chronological train/validation split (no shuffling)
    val_size = max(1, min(3, int(round(n * 0.25))))
    train_size = n - val_size
    if train_size < 2:
        train_size = 2
        val_size = n - train_size

    X_all = _build_features(idx, moy, use_seasonality)
    X_train, y_train = X_all[:train_size], y[:train_size]
    X_val, y_val = X_all[train_size:], y[train_size:]

    val_model = Ridge(alpha=1.0)
    val_model.fit(X_train, y_train)
    val_preds = np.maximum(0.0, val_model.predict(X_val))

    mae = float(np.mean(np.abs(y_val - val_preds)))
    rmse = float(np.sqrt(np.mean((y_val - val_preds) ** 2)))

    # Fit final model on all chronological full months
    final_model = Ridge(alpha=1.0)
    final_model.fit(X_all, y)
    in_sample_preds = np.maximum(0.0, final_model.predict(X_all))
    in_sample_residuals = y - in_sample_preds

    # Uncertainty standard error combines validation RMSE and in-sample residual spread
    residual_std = float(np.std(in_sample_residuals, ddof=1)) if n > 2 else mae
    base_sigma = max(rmse, residual_std, float(np.mean(y)) * 0.05)

    last_y, last_m = map(int, full_months[-1].split("-"))
    predictions: List[Dict[str, Any]] = []
    for offset in range(1, max(1, horizon_months) + 1):
        target_ym = _add_months(last_y, last_m, offset)
        target_moy = int(target_ym.split("-")[1])
        X_next = _build_features(np.array([float(n - 1 + offset)]), [target_moy], use_seasonality)
        pred_val = max(0.0, float(final_model.predict(X_next)[0]))
        # 80% / ~1.28-sigma band widening gently with forecast horizon
        band_half_width = 1.28 * base_sigma * math.sqrt(1.0 + 0.18 * (offset - 1))
        lower = max(0.0, pred_val - band_half_width)
        upper = pred_val + band_half_width
        predictions.append(
            {
                "month": target_ym,
                "month_offset": offset,
                "predicted_expense": round(pred_val, 2),
                "lower_bound": round(lower, 2),
                "upper_bound": round(upper, 2),
                "confidence_level": "80%",
            }
        )

    historical_avg = float(np.mean(y))
    next_pred = predictions[0]["predicted_expense"]
    pct_vs_avg = ((next_pred - historical_avg) / historical_avg * 100.0) if historical_avg > 0 else 0.0

    chart_series = [
        {
            "month": row["month"],
            "actual": row["actual_expense"],
            "predicted": None,
            "lower_bound": None,
            "upper_bound": None,
        }
        for row in historical_full
    ]
    for p in predictions:
        chart_series.append(
            {
                "month": p["month"],
                "actual": None,
                "predicted": p["predicted_expense"],
                "lower_bound": p["lower_bound"],
                "upper_bound": p["upper_bound"],
            }
        )

    return {
        "status": "ok",
        "available": True,
        "method": "ridge-time-series-seasonal" if use_seasonality else "ridge-linear-trend",
        "months_available": n,
        "months_required": MIN_FULL_MONTHS,
        "months_needed": 0,
        "training_months": n,
        "historical_monthly_average": round(historical_avg, 2),
        "next_month_vs_average_percent": round(pct_vs_avg, 2),
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "metrics": {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "validation_split": f"chronological ({train_size} train / {val_size} validation months)",
            "uncertainty_band": "80% prediction interval",
        },
        "partial_current_month": partial_current_month,
        "historical": historical_full,
        "predictions": predictions,
        "chart_series": chart_series,
    }
