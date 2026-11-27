"""Compatibility facade delegating to backend.insights.engine."""
from __future__ import annotations

from typing import Any, Dict, List

from backend.insights.engine import generate_personalized_insights


def build_insights(
    profile: Dict[str, Any],
    transactions: List[Dict[str, Any]],
    budgets: List[Dict[str, Any]],
    goals: List[Dict[str, Any]],
    forecast: Dict[str, Any],
    anomalies: Dict[str, Any],
    use_llm: bool = False,
) -> Dict[str, Any]:
    return generate_personalized_insights(
        profile=profile,
        transactions=transactions,
        budgets=budgets,
        goals=goals,
        forecast=forecast,
        anomalies=anomalies,
        use_llm=use_llm,
    )
