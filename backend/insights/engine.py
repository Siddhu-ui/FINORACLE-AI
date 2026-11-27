"""Evidence-First Personalized AI Insights Engine.

Pipeline:
Actual User Records -> Deterministic Financial Metrics -> Validated ML Outputs
-> Deduplicated Evidence Objects -> Optional LLM Explanation -> Pydantic Schema Validation
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from backend.config import get_settings
from backend.llm.provider import LLMNotConfiguredError, LLMProviderError, get_llm_provider
from backend.services.finance_math import (
    compute_budget_status,
    compute_category_breakdown,
    compute_monthly_aggregates,
    compute_period_summary,
    format_inr,
)


class InsightEvidence(BaseModel):
    metric_key: str
    metric_source: str
    timeframe: str
    primary_value_inr: Optional[float] = None
    comparison_value_inr: Optional[float] = None
    percent_change: Optional[float] = None
    extra: Dict[str, Any] = Field(default_factory=dict)


class InsightCard(BaseModel):
    id: str
    category: Literal[
        "cashflow_trend",
        "category_concentration",
        "budget_burn",
        "expense_forecast",
        "unusual_spending",
        "savings_and_goals",
    ]
    severity: Literal["positive", "info", "warning", "high"]
    title: str
    message: str
    action_item: str
    evidence: InsightEvidence
    llm_enhanced: bool = False


def _enhance_cards_with_llm(cards: List[InsightCard]) -> List[InsightCard]:
    """Optionally refine insight prose via LLM strictly from verified evidence JSON."""
    if not cards or not get_settings().is_llm_configured:
        return cards

    try:
        provider = get_llm_provider()
        payload = [
            {
                "id": c.id,
                "title": c.title,
                "message": c.message,
                "action_item": c.action_item,
                "evidence": c.evidence.model_dump(),
            }
            for c in cards
        ]
        system_prompt = (
            "You are a concise Indian personal-finance analyst. Rewrite ONLY `message` and `action_item` "
            "for each insight item to be clear, practical, and empathetic. "
            "STRICT RULES: Preserve every INR (₹) figure and percentage exactly as given in `evidence`; "
            "never invent new numbers or claims; never call unusual spending 'confirmed fraud'. "
            "Return ONLY a valid JSON array of objects with keys: `id`, `message`, `action_item`."
        )
        raw = provider.generate_text(
            system_prompt=system_prompt,
            user_prompt=json.dumps(payload, default=str),
            temperature=0.15,
        )
        # Strip markdown fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            return cards

        by_id = {
            str(item["id"]): item
            for item in parsed
            if isinstance(item, dict) and item.get("id") and item.get("message")
        }
        updated: List[InsightCard] = []
        for card in cards:
            patch = by_id.get(card.id)
            if patch:
                updated.append(
                    InsightCard.model_validate(
                        {
                            **card.model_dump(),
                            "message": str(patch["message"])[:500],
                            "action_item": str(patch.get("action_item") or card.action_item)[:300],
                            "llm_enhanced": True,
                        }
                    )
                )
            else:
                updated.append(card)
        return updated
    except (LLMNotConfiguredError, LLMProviderError, Exception):
        return cards


def generate_personalized_insights(
    profile: Dict[str, Any],
    transactions: List[Dict[str, Any]],
    budgets: List[Dict[str, Any]],
    goals: List[Dict[str, Any]],
    forecast: Dict[str, Any],
    anomalies: Dict[str, Any],
    use_llm: bool = False,
) -> Dict[str, Any]:
    """Build deduplicated, schema-validated, evidence-backed financial insights."""
    overall_summary = compute_period_summary(transactions)
    monthly_series = compute_monthly_aggregates(transactions)
    latest_month = monthly_series[-1]["month"] if monthly_series else None
    prev_month = monthly_series[-2]["month"] if len(monthly_series) >= 2 else None

    latest_summary = (
        compute_period_summary(transactions, month=latest_month)
        if latest_month
        else overall_summary
    )
    overall_categories = compute_category_breakdown(transactions)
    latest_categories = (
        compute_category_breakdown(transactions, month=latest_month)
        if latest_month
        else overall_categories
    )
    budget_status = compute_budget_status(budgets, transactions, month=latest_month)

    raw_cards: List[InsightCard] = []
    seen_keys = set()

    def _add_card(card: InsightCard) -> None:
        dedup_key = (card.category, card.evidence.metric_key)
        if dedup_key in seen_keys:
            return
        seen_keys.add(dedup_key)
        raw_cards.append(card)

    # 1. Cash-flow health & monthly spending trend
    if latest_summary["income"] > 0 or latest_summary["expenses"] > 0:
        inc = latest_summary["income"]
        exp = latest_summary["expenses"]
        net = latest_summary["net_cash_flow"]
        sr = latest_summary["savings_rate"]
        tf = latest_month or "all_recorded"

        if inc > 0 and net < 0:
            _add_card(
                InsightCard(
                    id=f"cashflow-deficit-{tf}",
                    category="cashflow_trend",
                    severity="high",
                    title="Cash-Flow Deficit Detected",
                    message=(
                        f"In {tf}, recorded expenses ({format_inr(exp)}) exceeded recorded income "
                        f"({format_inr(inc)}) by {format_inr(abs(net))}."
                    ),
                    action_item="Review discretionary categories and pause non-essential outlays until cash flow returns positive.",
                    evidence=InsightEvidence(
                        metric_key="monthly_net_cashflow",
                        metric_source="deterministic_ledger",
                        timeframe=tf,
                        primary_value_inr=round(net, 2),
                        comparison_value_inr=round(inc, 2),
                        percent_change=round(sr, 2),
                        extra={"recorded_income": inc, "recorded_expenses": exp},
                    ),
                )
            )
        elif inc > 0:
            _add_card(
                InsightCard(
                    id=f"cashflow-savings-rate-{tf}",
                    category="cashflow_trend",
                    severity="positive" if sr >= 20 else "info",
                    title="Healthy Savings Rate" if sr >= 20 else "Savings Rate Below 20% Benchmark",
                    message=(
                        f"In {tf}, you saved {format_inr(net)} out of {format_inr(inc)} recorded income "
                        f"({sr:.1f}% savings rate)."
                    ),
                    action_item=(
                        "Channel surplus into automated monthly SIPs or your emergency buffer."
                        if sr >= 20
                        else "Aim to lift your monthly savings rate toward 20% by trimming top variable expenses."
                    ),
                    evidence=InsightEvidence(
                        metric_key="monthly_savings_rate",
                        metric_source="deterministic_ledger",
                        timeframe=tf,
                        primary_value_inr=round(net, 2),
                        comparison_value_inr=round(inc, 2),
                        percent_change=round(sr, 2),
                        extra={"benchmark_percent": 20.0},
                    ),
                )
            )

    if len(monthly_series) >= 2:
        curr_m = monthly_series[-1]
        prev_m = monthly_series[-2]
        if prev_m["expenses"] > 0:
            delta_exp = curr_m["expenses"] - prev_m["expenses"]
            pct_chg = (delta_exp / prev_m["expenses"]) * 100.0
            if abs(pct_chg) >= 10.0:
                _add_card(
                    InsightCard(
                        id=f"mom-trend-{curr_m['month']}",
                        category="cashflow_trend",
                        severity="warning" if pct_chg > 0 else "positive",
                        title="Month-over-Month Spending Increase" if pct_chg > 0 else "Month-over-Month Spending Reduced",
                        message=(
                            f"Expenses changed by {pct_chg:+.1f}% ({format_inr(delta_exp)}) from "
                            f"{format_inr(prev_m['expenses'])} in {prev_m['month']} to {format_inr(curr_m['expenses'])} in {curr_m['month']}."
                        ),
                        action_item=(
                            "Inspect category spikes below to identify whether the rise was one-off or recurring."
                            if pct_chg > 0
                            else "Redirect the monthly spending savings toward your highest-priority financial goal."
                        ),
                        evidence=InsightEvidence(
                            metric_key="mom_expense_delta",
                            metric_source="deterministic_monthly_aggregates",
                            timeframe=f"{prev_m['month']} vs {curr_m['month']}",
                            primary_value_inr=curr_m["expenses"],
                            comparison_value_inr=prev_m["expenses"],
                            percent_change=round(pct_chg, 2),
                            extra={"delta_inr": round(delta_exp, 2)},
                        ),
                    )
                )

    # 2. Category concentration & MoM category spikes
    if latest_categories["categories"]:
        top = latest_categories["categories"][0]
        tf = latest_month or "all_recorded"
        _add_card(
            InsightCard(
                id=f"top-category-{top['category'].lower()}",
                category="category_concentration",
                severity="warning" if top["percentage"] >= 40 else "info",
                title=f"Top Spending Category: {top['category']}",
                message=(
                    f"{top['category']} accounts for {top['percentage']:.1f}% of your expenses in {tf} "
                    f"({format_inr(top['amount'])} across {top['transaction_count']} transaction(s))."
                ),
                action_item=(
                    f"Consider setting a dedicated category cap for {top['category']} in Budgets to avoid concentration drift."
                ),
                evidence=InsightEvidence(
                    metric_key=f"category_share_{top['category'].lower()}",
                    metric_source="deterministic_category_breakdown",
                    timeframe=tf,
                    primary_value_inr=top["amount"],
                    comparison_value_inr=latest_categories["total_expenses"],
                    percent_change=top["percentage"],
                    extra={"category": top["category"], "transaction_count": top["transaction_count"]},
                ),
            )
        )

    if latest_month and prev_month:
        prev_bd = compute_category_breakdown(transactions, month=prev_month)
        prev_map = {c["category"]: c["amount"] for c in prev_bd["categories"]}
        biggest_spike = None
        for c in latest_categories["categories"]:
            prev_amt = prev_map.get(c["category"], 0.0)
            if prev_amt > 0:
                inc_pct = ((c["amount"] - prev_amt) / prev_amt) * 100.0
                if inc_pct >= 25.0 and (c["amount"] - prev_amt) >= 1000.0:
                    if biggest_spike is None or (c["amount"] - prev_amt) > biggest_spike["delta"]:
                        biggest_spike = {
                            "category": c["category"],
                            "current": c["amount"],
                            "previous": prev_amt,
                            "delta": round(c["amount"] - prev_amt, 2),
                            "pct": round(inc_pct, 2),
                        }
        if biggest_spike:
            _add_card(
                InsightCard(
                    id=f"cat-spike-{biggest_spike['category'].lower()}",
                    category="category_concentration",
                    severity="warning",
                    title=f"Category Spike in {biggest_spike['category']}",
                    message=(
                        f"{biggest_spike['category']} rose {biggest_spike['pct']:+.1f}% "
                        f"({format_inr(biggest_spike['delta'])}) compared to {prev_month} "
                        f"({format_inr(biggest_spike['previous'])} → {format_inr(biggest_spike['current'])})."
                    ),
                    action_item=f"Review individual {biggest_spike['category']} entries in Transactions to trim repeat spend.",
                    evidence=InsightEvidence(
                        metric_key=f"category_spike_{biggest_spike['category'].lower()}",
                        metric_source="deterministic_category_mom",
                        timeframe=f"{prev_month} vs {latest_month}",
                        primary_value_inr=biggest_spike["current"],
                        comparison_value_inr=biggest_spike["previous"],
                        percent_change=biggest_spike["pct"],
                        extra={"delta_inr": biggest_spike["delta"]},
                    ),
                )
            )

    # 3. Budget burn-rate warnings
    if budget_status.get("has_budget"):
        util = float(budget_status["utilization_percent"])
        burn = budget_status["burn_rate_status"]
        if burn in ("exceeded", "burning_fast", "caution"):
            _add_card(
                InsightCard(
                    id=f"budget-burn-{budget_status['month']}",
                    category="budget_burn",
                    severity="high" if burn == "exceeded" else "warning",
                    title=(
                        "Monthly Budget Exceeded"
                        if burn == "exceeded"
                        else "Accelerated Budget Burn Rate"
                    ),
                    message=(
                        f"You have used {util:.1f}% ({format_inr(budget_status['total_spent'])} of "
                        f"{format_inr(budget_status['total_limit'])}) of your {budget_status['month']} budget "
                        f"(expected pace: {budget_status['expected_pace_percent']:.0f}%)."
                    ),
                    action_item=(
                        f"At the current daily rate, month-end spend projects to {format_inr(budget_status['projected_end_of_month_spend'])}. "
                        "Cap discretionary spend for the rest of the cycle."
                    ),
                    evidence=InsightEvidence(
                        metric_key=f"budget_burn_{budget_status['month']}",
                        metric_source="deterministic_budget_pacing",
                        timeframe=budget_status["month"],
                        primary_value_inr=budget_status["total_spent"],
                        comparison_value_inr=budget_status["total_limit"],
                        percent_change=util,
                        extra={
                            "expected_pace_percent": budget_status["expected_pace_percent"],
                            "projected_eom_spend": budget_status["projected_end_of_month_spend"],
                            "burn_rate_status": burn,
                        },
                    ),
                )
            )

    # 4. Forecasted expense trajectory (ML output)
    if forecast.get("available") and forecast.get("predictions"):
        nxt = forecast["predictions"][0]
        hist_avg = float(forecast.get("historical_monthly_average") or 0.0)
        pct_vs_avg = float(forecast.get("next_month_vs_average_percent") or 0.0)
        _add_card(
            InsightCard(
                id=f"ml-forecast-{nxt['month']}",
                category="expense_forecast",
                severity="warning" if pct_vs_avg >= 12.0 else "info",
                title=f"Projected Expenses for {nxt['month']}",
                message=(
                    f"Model forecasts {format_inr(nxt['predicted_expense'])} for {nxt['month']} "
                    f"(uncertainty band: {format_inr(nxt['lower_bound'])} – {format_inr(nxt['upper_bound'])}), "
                    f"{pct_vs_avg:+.1f}% vs your {forecast['training_months']}-month average ({format_inr(hist_avg)})."
                ),
                action_item="Keep at least the upper-band amount liquid in your monthly operating account.",
                evidence=InsightEvidence(
                    metric_key=f"expense_forecast_{nxt['month']}",
                    metric_source=f"ml_forecast_{forecast.get('method', 'ridge')}",
                    timeframe=nxt["month"],
                    primary_value_inr=nxt["predicted_expense"],
                    comparison_value_inr=hist_avg,
                    percent_change=pct_vs_avg,
                    extra={
                        "lower_bound": nxt["lower_bound"],
                        "upper_bound": nxt["upper_bound"],
                        "mae": forecast.get("mae"),
                        "rmse": forecast.get("rmse"),
                        "training_months": forecast.get("training_months"),
                    },
                ),
            )
        )

    # 5. Unusual spending alerts (ML anomaly detection, deduplicated)
    if anomalies.get("available") and anomalies.get("alerts"):
        top_alert = anomalies["alerts"][0]
        alert_count = len(anomalies["alerts"])
        _add_card(
            InsightCard(
                id=f"ml-unusual-{top_alert.get('transaction_id') or 'top'}",
                category="unusual_spending",
                severity="high" if top_alert.get("severity") == "high" else "warning",
                title=f"Unusual Spending Flagged ({alert_count} item{'s' if alert_count != 1 else ''})",
                message=(
                    f"{top_alert.get('description')}: {top_alert.get('explanation')} "
                    "Note: This indicates a statistical spending deviation, not confirmed fraud."
                ),
                action_item="Verify flagged transactions in your ledger and confirm whether they were planned one-off expenses.",
                evidence=InsightEvidence(
                    metric_key="unusual_spending_summary",
                    metric_source=f"ml_anomaly_{anomalies.get('method', 'isolation_forest')}",
                    timeframe=str(top_alert.get("date") or "recent"),
                    primary_value_inr=float(top_alert.get("amount") or 0.0),
                    extra={
                        "alert_count": alert_count,
                        "top_transaction": top_alert.get("description"),
                        "category": top_alert.get("category"),
                        "ratio_to_baseline": top_alert.get("ratio_to_baseline"),
                        "label": "Unusual Spending",
                    },
                ),
            )
        )

    # 6. Actionable savings opportunities & goal progress
    active_goals = [g for g in goals if str(g.get("status") or "active") in ("active", "paused")]
    if active_goals:
        total_saved = sum(float(g.get("current_amount") or 0.0) for g in active_goals)
        total_target = sum(float(g.get("target_amount") or 0.0) for g in active_goals)
        overall_pct = (total_saved / total_target * 100.0) if total_target > 0 else 0.0
        lead_goal = active_goals[0]
        _add_card(
            InsightCard(
                id="goals-progress-overview",
                category="savings_and_goals",
                severity="positive" if overall_pct >= 50 else "info",
                title=f"Savings Goals Progress ({len(active_goals)} Active)",
                message=(
                    f"Across {len(active_goals)} active goal(s), you have saved {format_inr(total_saved)} of "
                    f"{format_inr(total_target)} ({overall_pct:.1f}% funded), led by '{lead_goal.get('title', 'Goal')}'."
                ),
                action_item="Automate monthly contributions right after salary credit to stay ahead of target dates.",
                evidence=InsightEvidence(
                    metric_key="active_goals_funding",
                    metric_source="deterministic_goals_tracker",
                    timeframe="current",
                    primary_value_inr=round(total_saved, 2),
                    comparison_value_inr=round(total_target, 2),
                    percent_change=round(overall_pct, 2),
                    extra={"active_goal_count": len(active_goals)},
                ),
            )
        )

    final_cards = _enhance_cards_with_llm(raw_cards) if use_llm else raw_cards

    # Format compatible summary dict
    cat_totals = {c["category"]: c["amount"] for c in overall_categories["categories"]}

    # Per-category month-over-month deltas for visual breakdown
    category_mom: List[Dict[str, Any]] = []
    if latest_month:
        prev_map_all: Dict[str, float] = {}
        if prev_month:
            prev_bd_all = compute_category_breakdown(transactions, month=prev_month)
            prev_map_all = {c["category"]: c["amount"] for c in prev_bd_all["categories"]}
        for c in latest_categories["categories"][:8]:
            prev_amt = float(prev_map_all.get(c["category"], 0.0))
            delta = round(c["amount"] - prev_amt, 2)
            category_mom.append(
                {
                    "category": c["category"],
                    "current": c["amount"],
                    "previous": prev_amt,
                    "delta": delta,
                    "delta_percent": round((delta / prev_amt) * 100.0, 1) if prev_amt > 0 else None,
                    "share_percent": c["percentage"],
                }
            )

    savings_opportunities = _build_savings_opportunities(
        latest_month=latest_month,
        latest_categories=latest_categories,
        latest_summary=latest_summary,
        budget_status=budget_status,
        goals=goals,
    )

    top_category = None
    if latest_categories["categories"]:
        t = latest_categories["categories"][0]
        top_category = {
            "category": t["category"],
            "amount": t["amount"],
            "share_percent": t["percentage"],
            "month": latest_month,
        }

    return {
        "summary": {
            "recorded_income": overall_summary["income"],
            "recorded_expenses": overall_summary["expenses"],
            "net_cash_flow": overall_summary["net_cash_flow"],
            "savings_rate": overall_summary["savings_rate"],
            "latest_month": latest_month,
            "latest_month_summary": latest_summary,
            "planned_monthly_income": float(profile.get("monthly_income") or 0.0),
        },
        "category_totals": cat_totals,
        "monthly_series": monthly_series,
        "category_mom": category_mom,
        "top_category": top_category,
        "savings_opportunities": savings_opportunities,
        "has_transactions": len(transactions) > 0,
        "transaction_count": len(transactions),
        "budget_status": budget_status,
        "forecast": forecast,
        "unusual_spending": anomalies,
        "insights": [c.model_dump() for c in final_cards],
        "llm_enhanced": any(c.llm_enhanced for c in final_cards),
    }


DISCRETIONARY_CATEGORIES = {"food", "entertainment", "shopping", "travel"}


def _months_until(target_date: str, today: Optional[date] = None) -> int:
    today = today or date.today()
    try:
        y, m, _ = (int(p) for p in str(target_date)[:10].split("-"))
    except Exception:
        return 12
    return max(1, (y - today.year) * 12 + (m - today.month))


def _build_savings_opportunities(
    latest_month: Optional[str],
    latest_categories: Dict[str, Any],
    latest_summary: Dict[str, Any],
    budget_status: Dict[str, Any],
    goals: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Deterministic, ₹-denominated savings suggestions tied to real spending, budgets and goals."""
    out: List[Dict[str, Any]] = []
    tf = latest_month or "recorded period"

    # 1. Trim top discretionary categories by 10%
    discretionary = [
        c
        for c in latest_categories.get("categories", [])
        if str(c["category"]).lower() in DISCRETIONARY_CATEGORIES and c["amount"] >= 1000.0
    ]
    for c in discretionary[:3]:
        monthly = round(c["amount"] * 0.10, 2)
        out.append(
            {
                "id": f"trim-{str(c['category']).lower()}",
                "kind": "category_trim",
                "title": f"Trim {c['category']} spending by 10%",
                "message": (
                    f"You spent {format_inr(c['amount'])} on {c['category']} in {tf}. "
                    f"A 10% reduction frees up {format_inr(monthly)} every month."
                ),
                "monthly_saving_inr": monthly,
                "annual_saving_inr": round(monthly * 12, 2),
                "evidence": f"{c['transaction_count']} transaction(s) · {c['percentage']:.1f}% of {tf} expenses",
            }
        )

    # 2. Budget category overruns
    for cat in budget_status.get("categories", []) if budget_status.get("has_budget") else []:
        if cat.get("exceeded") and cat.get("limit", 0) > 0:
            over = round(float(cat["spent"]) - float(cat["limit"]), 2)
            out.append(
                {
                    "id": f"budget-over-{str(cat['category']).lower()}",
                    "kind": "budget_overrun",
                    "title": f"{cat['category']} is over budget",
                    "message": (
                        f"{cat['category']} spend of {format_inr(cat['spent'])} exceeds your "
                        f"{format_inr(cat['limit'])} limit by {format_inr(over)} in {budget_status.get('month')}."
                    ),
                    "monthly_saving_inr": over,
                    "annual_saving_inr": round(over * 12, 2),
                    "evidence": f"Budget '{budget_status.get('budget_name')}' · {cat['utilization_percent']:.0f}% utilised",
                }
            )

    # 3. Goal funding gaps vs current monthly surplus
    surplus = float(latest_summary.get("net_cash_flow") or 0.0)
    for g in [x for x in goals if str(x.get("status") or "active") == "active"][:3]:
        target = float(g.get("target_amount") or 0.0)
        saved = float(g.get("current_amount") or 0.0)
        remaining = max(0.0, target - saved)
        if remaining <= 0:
            continue
        months_left = _months_until(str(g.get("target_date") or ""))
        required = round(remaining / months_left, 2)
        contribution = float(g.get("monthly_contribution") or 0.0)
        gap = round(required - contribution, 2)
        if gap > 0:
            fundable = "Your latest monthly surplus can cover this gap." if surplus >= gap else (
                f"Your latest monthly surplus is {format_inr(max(0.0, surplus))}, so also trim spending to close the gap."
            )
            out.append(
                {
                    "id": f"goal-gap-{g.get('id') or g.get('title')}",
                    "kind": "goal_gap",
                    "title": f"Fund '{g.get('title')}' on time",
                    "message": (
                        f"{format_inr(remaining)} is still needed over {months_left} month(s) — "
                        f"{format_inr(required)}/month required vs {format_inr(contribution)} planned. "
                        f"Add {format_inr(gap)}/month. {fundable}"
                    ),
                    "monthly_saving_inr": gap,
                    "annual_saving_inr": round(gap * 12, 2),
                    "evidence": f"Target {format_inr(target)} by {str(g.get('target_date'))[:10]}",
                }
            )

    out.sort(key=lambda x: x["monthly_saving_inr"], reverse=True)
    return out[:6]
