"""Anomaly Detection Engine for Unusual Spending.

Uses Isolation Forest for larger histories (>=10 expenses) and category-level
IQR / robust MAD Z-score fallback for smaller histories (4-9 expenses).
Always labels results as 'Unusual Spending'—never claims confirmed fraud.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
from sklearn.ensemble import IsolationForest

from backend.services.finance_math import format_inr


def _parse_date(val: Any) -> Optional[date]:
    try:
        return datetime.strptime(str(val)[:10], "%Y-%m-%d").date()
    except Exception:
        return None


def _build_human_explanation(
    tx: Dict[str, Any],
    all_expenses: List[Dict[str, Any]],
) -> str:
    amount = float(tx.get("amount") or 0.0)
    category = str(tx.get("category") or "Other")
    tx_date = _parse_date(tx.get("date"))

    # Compute 90-day category baseline (excluding the flagged transaction itself)
    same_cat_90d = []
    same_cat_all = []
    all_other = []
    for other in all_expenses:
        if other is tx or (tx.get("id") and other.get("id") == tx.get("id")):
            continue
        o_amt = float(other.get("amount") or 0.0)
        if o_amt <= 0:
            continue
        all_other.append(o_amt)
        if str(other.get("category") or "Other").lower() == category.lower():
            same_cat_all.append(o_amt)
            o_date = _parse_date(other.get("date"))
            if tx_date and o_date and abs((tx_date - o_date).days) <= 90:
                same_cat_90d.append(o_amt)

    if len(same_cat_90d) >= 2:
        avg = float(np.mean(same_cat_90d))
        if avg > 0:
            ratio = amount / avg
            return (
                f"{format_inr(amount)} is {ratio:.1f}× higher than your 90-day average "
                f"in {category} ({format_inr(avg)})."
            )

    if len(same_cat_all) >= 2:
        avg = float(np.mean(same_cat_all))
        if avg > 0:
            ratio = amount / avg
            return (
                f"{format_inr(amount)} is {ratio:.1f}× higher than your historical average "
                f"in {category} ({format_inr(avg)})."
            )

    if all_other:
        overall_median = float(np.median(all_other))
        if overall_median > 0:
            ratio = amount / overall_median
            return (
                f"{format_inr(amount)} in {category} is {ratio:.1f}× your typical expense "
                f"transaction median ({format_inr(overall_median)})."
            )

    return f"{format_inr(amount)} in {category} stands out significantly from your recorded spending pattern."


def detect_unusual_spending(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Identify unusual spending using Isolation Forest with category IQR/MAD fallback."""
    expenses = [
        tx
        for tx in transactions
        if str(tx.get("type") or "").lower() == "expense" and float(tx.get("amount") or 0.0) > 0
    ]

    if len(expenses) < 4:
        return {
            "status": "insufficient_data",
            "available": False,
            "method": None,
            "label": "Unusual Spending",
            "reason": (
                f"At least 4 expense transactions are required to detect unusual spending "
                f"(currently {len(expenses)} recorded)."
            ),
            "alerts": [],
        }

    # Precompute category statistics
    cat_amounts: Dict[str, List[float]] = defaultdict(list)
    for tx in expenses:
        cat_amounts[str(tx.get("category") or "Other").lower()].append(float(tx.get("amount") or 0.0))

    all_vals = np.array([float(tx.get("amount") or 0.0) for tx in expenses], dtype=float)
    global_median = float(np.median(all_vals))
    global_mad = float(np.median(np.abs(all_vals - global_median))) or max(1.0, float(np.std(all_vals)))

    cat_stats: Dict[str, Dict[str, float]] = {}
    for cat, vals in cat_amounts.items():
        arr = np.array(vals, dtype=float)
        med = float(np.median(arr))
        q1, q3 = float(np.percentile(arr, 25)), float(np.percentile(arr, 75))
        iqr = q3 - q1
        mad = float(np.median(np.abs(arr - med)))
        cat_stats[cat] = {
            "count": float(len(arr)),
            "median": med,
            "iqr": iqr,
            "iqr_upper": q3 + 1.5 * iqr if iqr > 0 else med * 2.2,
            "mad": mad,
        }

    alerts: List[Dict[str, Any]] = []

    if len(expenses) >= 10:
        method = "isolation_forest"
        features = []
        for tx in expenses:
            amt = float(tx.get("amount") or 0.0)
            cat_key = str(tx.get("category") or "Other").lower()
            st = cat_stats[cat_key]
            base_med = st["median"] if st["count"] >= 3 else global_median
            base_mad = st["mad"] if (st["count"] >= 3 and st["mad"] > 0) else global_mad
            ratio = amt / max(1.0, base_med)
            robust_z = 0.6745 * (amt - base_med) / max(1.0, base_mad)
            features.append([np.log1p(amt), ratio, robust_z])

        X = np.array(features, dtype=float)
        model = IsolationForest(
            n_estimators=150,
            contamination=min(0.15, max(0.05, 2.0 / len(expenses))),
            random_state=42,
        )
        preds = model.fit_predict(X)
        scores = model.decision_function(X)

        for tx, pred, score, feat in zip(expenses, preds, scores, features):
            amt = float(tx.get("amount") or 0.0)
            ratio = feat[1]
            robust_z = feat[2]
            # Only flag unusually HIGH spending (avoid flagging tiny ₹10 tea purchases as spending anomalies)
            if int(pred) == -1 and amt > global_median and (ratio >= 1.6 or robust_z >= 2.0):
                alerts.append(
                    {
                        "transaction_id": tx.get("id"),
                        "description": tx.get("description"),
                        "category": tx.get("category") or "Other",
                        "amount": round(amt, 2),
                        "date": tx.get("date"),
                        "label": "Unusual Spending",
                        "severity": "high" if ratio >= 2.5 or robust_z >= 3.5 else "medium",
                        "ratio_to_baseline": round(float(ratio), 2),
                        "anomaly_score": round(float(score), 4),
                        "explanation": _build_human_explanation(tx, expenses),
                    }
                )
    else:
        method = "robust_iqr_zscore"
        for tx in expenses:
            amt = float(tx.get("amount") or 0.0)
            cat_key = str(tx.get("category") or "Other").lower()
            st = cat_stats[cat_key]
            if st["count"] >= 3:
                base_med = st["median"]
                base_mad = st["mad"] if st["mad"] > 0 else global_mad
                upper_fence = st["iqr_upper"]
            else:
                base_med = global_median
                base_mad = global_mad
                q1, q3 = float(np.percentile(all_vals, 25)), float(np.percentile(all_vals, 75))
                iqr = q3 - q1
                upper_fence = q3 + 1.5 * iqr if iqr > 0 else global_median * 2.2

            robust_z = 0.6745 * (amt - base_med) / max(1.0, base_mad)
            ratio = amt / max(1.0, base_med)

            if amt > upper_fence and (robust_z >= 2.2 or ratio >= 2.0):
                alerts.append(
                    {
                        "transaction_id": tx.get("id"),
                        "description": tx.get("description"),
                        "category": tx.get("category") or "Other",
                        "amount": round(amt, 2),
                        "date": tx.get("date"),
                        "label": "Unusual Spending",
                        "severity": "high" if ratio >= 2.5 or robust_z >= 3.5 else "medium",
                        "ratio_to_baseline": round(float(ratio), 2),
                        "anomaly_score": round(float(-robust_z), 4),
                        "explanation": _build_human_explanation(tx, expenses),
                    }
                )

    alerts.sort(key=lambda item: (item["severity"] == "high", item["amount"]), reverse=True)
    return {
        "status": "ok",
        "available": True,
        "method": method,
        "label": "Unusual Spending",
        "disclaimer": "Flagged items indicate statistical deviations from your typical spending pattern, not confirmed fraud.",
        "total_analyzed": len(expenses),
        "alerts": alerts[:15],
    }
