"""Pure, deterministic, unit-tested Indian personal finance math functions.

All monetary totals, percentages, savings rates, affordability checks, EMI/SIP
compounding, budget pacing, and what-if simulations execute here—never in an LLM.
"""
from __future__ import annotations

import calendar
import math
from collections import defaultdict
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple


def format_inr(amount: float) -> str:
    """Format a numeric rupee amount using Indian numbering (Lakhs/Crores)."""
    negative = amount < 0
    val = abs(round(float(amount), 2))
    integer_part = int(val)
    decimal_part = round(val - integer_part, 2)

    s = str(integer_part)
    if len(s) > 3:
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        formatted = ",".join(groups) + "," + last3
    else:
        formatted = s

    if decimal_part > 0:
        frac = f"{decimal_part:.2f}"[1:]
        formatted = f"{formatted}{frac}"

    return f"-₹{formatted}" if negative else f"₹{formatted}"


def calculate_sip_future_value(
    monthly_investment: float,
    annual_return_percent: float,
    years: int,
) -> Dict[str, float]:
    """Deterministic SIP compounding formula: M = P * [((1+i)^n - 1) / i] * (1+i)."""
    if monthly_investment < 0 or annual_return_percent < 0 or years <= 0:
        raise ValueError("SIP inputs must be non-negative with positive years.")
    months = years * 12
    total_invested = monthly_investment * months
    monthly_rate = (annual_return_percent / 100.0) / 12.0
    if monthly_rate == 0:
        future_value = total_invested
    else:
        future_value = (
            monthly_investment
            * ((math.pow(1.0 + monthly_rate, months) - 1.0) / monthly_rate)
            * (1.0 + monthly_rate)
        )
    wealth_gain = future_value - total_invested
    return {
        "monthly_investment": round(monthly_investment, 2),
        "annual_return_percent": round(annual_return_percent, 2),
        "years": years,
        "total_invested": round(total_invested, 2),
        "wealth_gain": round(wealth_gain, 2),
        "future_value": round(future_value, 2),
    }


def compute_monthly_aggregates(
    transactions: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Aggregate transactions chronologically by YYYY-MM."""
    buckets: Dict[str, Dict[str, float]] = defaultdict(
        lambda: {"income": 0.0, "expenses": 0.0, "tx_count": 0}
    )
    for tx in transactions:
        tx_date = str(tx.get("date") or "")[:7]
        if len(tx_date) != 7 or tx_date[4] != "-":
            continue
        amount = float(tx.get("amount") or 0.0)
        if amount <= 0:
            continue
        tx_type = str(tx.get("type") or "").lower()
        if tx_type == "income":
            buckets[tx_date]["income"] += amount
            buckets[tx_date]["tx_count"] += 1
        elif tx_type == "expense":
            buckets[tx_date]["expenses"] += amount
            buckets[tx_date]["tx_count"] += 1

    result: List[Dict[str, Any]] = []
    for month in sorted(buckets.keys()):
        inc = round(buckets[month]["income"], 2)
        exp = round(buckets[month]["expenses"], 2)
        net = round(inc - exp, 2)
        savings_rate = round((net / inc) * 100.0, 2) if inc > 0 else 0.0
        result.append(
            {
                "month": month,
                "income": inc,
                "expenses": exp,
                "net_savings": net,
                "savings_rate": savings_rate,
                "transaction_count": int(buckets[month]["tx_count"]),
            }
        )
    return result


def compute_period_summary(
    transactions: List[Dict[str, Any]],
    month: Optional[str] = None,
) -> Dict[str, Any]:
    """Compute exact income, expenses, net cash flow, and savings rate for a month or all records."""
    filtered = transactions
    if month:
        filtered = [t for t in transactions if str(t.get("date") or "").startswith(month)]

    income = sum(
        float(t.get("amount") or 0.0)
        for t in filtered
        if str(t.get("type") or "").lower() == "income"
    )
    expenses = sum(
        float(t.get("amount") or 0.0)
        for t in filtered
        if str(t.get("type") or "").lower() == "expense"
    )
    net = income - expenses
    savings_rate = (net / income * 100.0) if income > 0 else 0.0

    return {
        "month": month or "all_recorded",
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "net_cash_flow": round(net, 2),
        "savings": round(max(0.0, net), 2),
        "savings_rate": round(savings_rate, 2),
        "transaction_count": len(filtered),
    }


def compute_category_breakdown(
    transactions: List[Dict[str, Any]],
    month: Optional[str] = None,
) -> Dict[str, Any]:
    """Compute category totals and percentage shares for expense transactions."""
    filtered = [
        t
        for t in transactions
        if str(t.get("type") or "").lower() == "expense"
        and (not month or str(t.get("date") or "").startswith(month))
    ]
    totals: Dict[str, float] = defaultdict(float)
    counts: Dict[str, int] = defaultdict(int)
    for tx in filtered:
        cat = str(tx.get("category") or "Other").strip() or "Other"
        totals[cat] += float(tx.get("amount") or 0.0)
        counts[cat] += 1

    grand_total = sum(totals.values())
    categories = []
    for cat, amt in sorted(totals.items(), key=lambda x: x[1], reverse=True):
        pct = (amt / grand_total * 100.0) if grand_total > 0 else 0.0
        categories.append(
            {
                "category": cat,
                "amount": round(amt, 2),
                "percentage": round(pct, 2),
                "transaction_count": counts[cat],
            }
        )

    return {
        "month": month or "all_recorded",
        "total_expenses": round(grand_total, 2),
        "categories": categories,
    }


def compute_budget_status(
    budgets: List[Dict[str, Any]],
    transactions: List[Dict[str, Any]],
    month: Optional[str] = None,
    reference_date: Optional[date] = None,
) -> Dict[str, Any]:
    """Evaluate budget utilization and burn-rate pacing strictly from actual transactions."""
    ref = reference_date or date.today()
    target_month = month or ref.strftime("%Y-%m")

    active_budget = next((b for b in budgets if b.get("month") == target_month), None)
    if not active_budget and budgets:
        active_budget = budgets[0]
        target_month = str(active_budget.get("month") or target_month)

    if not active_budget:
        return {
            "has_budget": False,
            "month": target_month,
            "total_limit": 0.0,
            "total_spent": 0.0,
            "utilization_percent": 0.0,
            "burn_rate_status": "no_budget",
            "categories": [],
        }

    breakdown = compute_category_breakdown(transactions, month=target_month)
    spent_by_cat = {c["category"].lower(): c["amount"] for c in breakdown["categories"]}
    total_spent = breakdown["total_expenses"]
    total_limit = float(active_budget.get("total_limit") or 0.0)
    utilization = (total_spent / total_limit * 100.0) if total_limit > 0 else 0.0

    # Calculate month elapsed percentage for burn-rate pacing
    try:
        y, m = map(int, target_month.split("-"))
        days_in_month = calendar.monthrange(y, m)[1]
        if ref.year == y and ref.month == m:
            days_elapsed = max(1, ref.day)
        elif (ref.year, ref.month) > (y, m):
            days_elapsed = days_in_month
        else:
            days_elapsed = 1
    except Exception:
        days_in_month = 30
        days_elapsed = max(1, ref.day)

    expected_pace_pct = (days_elapsed / days_in_month) * 100.0
    projected_eom_spend = (total_spent / days_elapsed) * days_in_month if days_elapsed > 0 else total_spent

    if utilization >= 100:
        burn_status = "exceeded"
    elif utilization > expected_pace_pct + 15:
        burn_status = "burning_fast"
    elif utilization >= 80:
        burn_status = "caution"
    else:
        burn_status = "on_track"

    raw_cats = active_budget.get("budget_categories") or active_budget.get("categories") or []
    cat_status = []
    for c in raw_cats:
        cname = str(c.get("category") or "Other")
        climit = float(c.get("limit_amount") or 0.0)
        cspent = spent_by_cat.get(cname.lower(), 0.0)
        cutil = (cspent / climit * 100.0) if climit > 0 else 0.0
        cat_status.append(
            {
                "category": cname,
                "limit": round(climit, 2),
                "spent": round(cspent, 2),
                "remaining": round(climit - cspent, 2),
                "utilization_percent": round(cutil, 2),
                "exceeded": cutil >= 100.0,
            }
        )

    return {
        "has_budget": True,
        "budget_name": active_budget.get("name") or f"Budget {target_month}",
        "month": target_month,
        "total_limit": round(total_limit, 2),
        "total_spent": round(total_spent, 2),
        "remaining": round(total_limit - total_spent, 2),
        "utilization_percent": round(utilization, 2),
        "expected_pace_percent": round(expected_pace_pct, 2),
        "projected_end_of_month_spend": round(projected_eom_spend, 2),
        "burn_rate_status": burn_status,
        "categories": cat_status,
    }


def evaluate_affordability(
    purchase_amount: float,
    monthly_income: float,
    monthly_expenses: float,
    liquid_savings: float = 0.0,
    recommended_emergency_months: int = 3,
) -> Dict[str, Any]:
    """Deterministic affordability check for a one-time lump-sum purchase (e.g., ₹40,000 laptop)."""
    if purchase_amount <= 0:
        raise ValueError("Purchase amount must be positive.")

    monthly_surplus = monthly_income - monthly_expenses
    emergency_target = monthly_expenses * recommended_emergency_months
    post_purchase_savings = liquid_savings - purchase_amount
    months_of_surplus = (
        round(purchase_amount / monthly_surplus, 2) if monthly_surplus > 0 else None
    )

    flags: List[str] = []
    if monthly_surplus <= 0:
        flags.append("Negative or zero monthly cash-flow surplus.")
    if liquid_savings > 0 and post_purchase_savings < emergency_target:
        flags.append(
            f"Purchase reduces liquid savings below the {recommended_emergency_months}-month emergency buffer ({format_inr(emergency_target)})."
        )
    if monthly_income > 0 and (purchase_amount / monthly_income) > 0.5:
        flags.append("Purchase exceeds 50% of one month's income.")

    if monthly_surplus <= 0 and liquid_savings < purchase_amount:
        verdict = "not_affordable_now"
        reason = "Current expenses equal or exceed income and liquid savings do not cover the purchase."
    elif liquid_savings >= purchase_amount + emergency_target:
        verdict = "affordable_comfortably"
        reason = "Covered by surplus liquidity while keeping a 3-month emergency buffer intact."
    elif monthly_surplus > 0 and months_of_surplus is not None and months_of_surplus <= 3:
        verdict = "affordable_with_caution"
        reason = f"Can be funded from {months_of_surplus:.1f} months of current net surplus ({format_inr(monthly_surplus)}/month)."
    elif monthly_surplus > 0 and months_of_surplus is not None:
        verdict = "stretch_purchase"
        reason = f"Requires {months_of_surplus:.1f} months of full net surplus ({format_inr(monthly_surplus)}/month); consider saving ahead rather than using debt."
    else:
        verdict = "high_risk"
        reason = "No positive monthly surplus to replenish savings after this outlay."

    return {
        "purchase_amount": round(purchase_amount, 2),
        "monthly_income": round(monthly_income, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "monthly_surplus": round(monthly_surplus, 2),
        "liquid_savings_assumed": round(liquid_savings, 2),
        "emergency_buffer_3m": round(emergency_target, 2),
        "months_of_surplus_needed": months_of_surplus,
        "verdict": verdict,
        "reason": reason,
        "risk_flags": flags,
    }


def simulate_advanced_scenario(
    baseline_income: float,
    baseline_expenses: float,
    changes: List[Dict[str, Any]],
    income_loss_months: int = 0,
    existing_savings: float = 0.0,
    horizon_months: int = 12,
) -> Dict[str, Any]:
    """Deterministic multi-scenario engine supporting salary drops, income loss for N months,
    lump-sum purchases, recurring savings allocations, and category expense cuts.
    """
    modified_income = float(baseline_income)
    modified_expenses = float(baseline_expenses)
    one_time_outflow = 0.0
    recurring_savings_allocation = 0.0

    for c in changes:
        c_type = str(c.get("type") or "")
        amount = float(c.get("amount") or 0.0)
        if c_type == "income_increase":
            modified_income += amount
        elif c_type == "income_decrease":
            modified_income = max(0.0, modified_income - amount)
        elif c_type in ("expense_increase", "new_loan_emi"):
            modified_expenses += amount
        elif c_type == "expense_decrease":
            modified_expenses = max(0.0, modified_expenses - amount)
        elif c_type == "one_time_expense":
            one_time_outflow += amount
        elif c_type == "savings_increase":
            recurring_savings_allocation += amount

    baseline_monthly_savings = baseline_income - baseline_expenses
    steady_modified_monthly_savings = modified_income - modified_expenses

    projection: List[Dict[str, Any]] = []
    cum_baseline = existing_savings
    cum_scenario = existing_savings - one_time_outflow
    min_cumulative = cum_scenario

    total_scenario_income = 0.0
    total_scenario_expenses = 0.0

    for m in range(1, horizon_months + 1):
        month_income = 0.0 if m <= income_loss_months else modified_income
        month_expense = modified_expenses
        total_scenario_income += month_income
        total_scenario_expenses += month_expense

        cum_baseline += baseline_monthly_savings
        cum_scenario += (month_income - month_expense)
        min_cumulative = min(min_cumulative, cum_scenario)

        projection.append(
            {
                "month": f"M{m}",
                "baseline": round(cum_baseline, 2),
                "scenario": round(cum_scenario, 2),
                "monthly_scenario_net": round(month_income - month_expense, 2),
            }
        )

    avg_scenario_monthly_savings = (
        (total_scenario_income - total_scenario_expenses - one_time_outflow) / horizon_months
    )
    monthly_net_delta = steady_modified_monthly_savings - baseline_monthly_savings
    if income_loss_months > 0:
        effective_monthly_delta = avg_scenario_monthly_savings - baseline_monthly_savings
    else:
        effective_monthly_delta = monthly_net_delta

    baseline_6m = existing_savings + baseline_monthly_savings * 6
    baseline_12m = existing_savings + baseline_monthly_savings * 12
    scenario_6m = projection[5]["scenario"] if len(projection) >= 6 else cum_scenario
    scenario_12m = projection[11]["scenario"] if len(projection) >= 12 else cum_scenario

    delta_percent = (
        (effective_monthly_delta / abs(baseline_monthly_savings)) * 100.0
        if baseline_monthly_savings != 0
        else 0.0
    )

    # Runway in months if net cash flow turns negative
    runway_months: Optional[float] = None
    if steady_modified_monthly_savings < 0 and existing_savings > 0:
        runway_months = round(existing_savings / abs(steady_modified_monthly_savings), 1)
    elif income_loss_months > 0 and modified_expenses > 0:
        runway_months = round(existing_savings / modified_expenses, 1) if existing_savings > 0 else 0.0

    # Risk flags
    risk_flags: List[Dict[str, str]] = []
    if steady_modified_monthly_savings < 0:
        risk_flags.append(
            {
                "code": "monthly_deficit",
                "severity": "high",
                "message": f"Projected monthly expenses ({format_inr(modified_expenses)}) exceed projected income ({format_inr(modified_income)}) by {format_inr(abs(steady_modified_monthly_savings))}/month.",
            }
        )
    elif modified_income > 0 and (steady_modified_monthly_savings / modified_income) < 0.20:
        rate = (steady_modified_monthly_savings / modified_income) * 100.0
        risk_flags.append(
            {
                "code": "low_savings_rate",
                "severity": "medium",
                "message": f"Projected savings rate drops to {rate:.1f}%, below the 20% personal-finance target.",
            }
        )

    if income_loss_months > 0:
        loss_gap = modified_expenses * income_loss_months
        risk_flags.append(
            {
                "code": "income_interruption",
                "severity": "high",
                "message": f"{income_loss_months} month(s) without income creates an expense funding requirement of {format_inr(loss_gap)}.",
            }
        )

    if one_time_outflow > 0 and steady_modified_monthly_savings > 0:
        recovery = one_time_outflow / steady_modified_monthly_savings
        if recovery > 3:
            risk_flags.append(
                {
                    "code": "slow_recovery",
                    "severity": "medium",
                    "message": f"The {format_inr(one_time_outflow)} one-time outlay takes {recovery:.1f} months of surplus to replenish.",
                }
            )
    elif one_time_outflow > 0 and steady_modified_monthly_savings <= 0:
        risk_flags.append(
            {
                "code": "unrecoverable_outlay",
                "severity": "high",
                "message": f"The {format_inr(one_time_outflow)} one-time outlay cannot be replenished from monthly cash flow.",
            }
        )

    if recurring_savings_allocation > 0 and recurring_savings_allocation > steady_modified_monthly_savings:
        risk_flags.append(
            {
                "code": "savings_target_exceeds_surplus",
                "severity": "medium",
                "message": f"Additional monthly savings target ({format_inr(recurring_savings_allocation)}) exceeds available monthly surplus ({format_inr(max(0.0, steady_modified_monthly_savings))}).",
            }
        )

    baseline_savings_rate = (
        (baseline_monthly_savings / baseline_income) * 100.0 if baseline_income > 0 else 0.0
    )
    modified_savings_rate = (
        (steady_modified_monthly_savings / modified_income) * 100.0 if modified_income > 0 else 0.0
    )

    return {
        "baseline": {
            "income": round(baseline_income, 2),
            "expenses": round(baseline_expenses, 2),
            "monthly_savings": round(baseline_monthly_savings, 2),
            "savings_rate": round(baseline_savings_rate, 2),
            "savings_6m": round(baseline_6m, 2),
            "savings_12m": round(baseline_12m, 2),
        },
        "modified": {
            "income": round(modified_income, 2),
            "expenses": round(modified_expenses, 2),
            "one_time_outflow": round(one_time_outflow, 2),
            "income_loss_months": income_loss_months,
            "recurring_savings_allocation": round(recurring_savings_allocation, 2),
            "monthly_savings": round(steady_modified_monthly_savings, 2),
            "savings_rate": round(modified_savings_rate, 2),
            "savings_6m": round(scenario_6m, 2),
            "savings_12m": round(scenario_12m, 2),
            "min_cumulative_balance": round(min_cumulative, 2),
        },
        "impact": {
            "monthly_net_delta": round(effective_monthly_delta, 2),
            "steady_monthly_net_delta": round(monthly_net_delta, 2),
            "delta_percent": round(delta_percent, 2),
            "annual_net_difference": round(scenario_12m - baseline_12m, 2),
            "runway_months": runway_months,
            "goal_impact": "Accelerates Goals" if (scenario_12m - baseline_12m) >= 0 else "Delays Goals",
        },
        "risk_flags": risk_flags,
        "comparison_table": [
            {
                "metric": "Monthly Income",
                "current": round(baseline_income, 2),
                "projected": round(modified_income, 2),
                "delta": round(modified_income - baseline_income, 2),
            },
            {
                "metric": "Monthly Expenses",
                "current": round(baseline_expenses, 2),
                "projected": round(modified_expenses, 2),
                "delta": round(modified_expenses - baseline_expenses, 2),
            },
            {
                "metric": "Monthly Net Cash Flow",
                "current": round(baseline_monthly_savings, 2),
                "projected": round(steady_modified_monthly_savings, 2),
                "delta": round(steady_modified_monthly_savings - baseline_monthly_savings, 2),
            },
            {
                "metric": "Savings Rate (%)",
                "current": round(baseline_savings_rate, 2),
                "projected": round(modified_savings_rate, 2),
                "delta": round(modified_savings_rate - baseline_savings_rate, 2),
            },
            {
                "metric": "6-Month Cumulative Net",
                "current": round(baseline_6m, 2),
                "projected": round(scenario_6m, 2),
                "delta": round(scenario_6m - baseline_6m, 2),
            },
            {
                "metric": "12-Month Cumulative Net",
                "current": round(baseline_12m, 2),
                "projected": round(scenario_12m, 2),
                "delta": round(scenario_12m - baseline_12m, 2),
            },
        ],
        "projection_12m": projection,
    }
