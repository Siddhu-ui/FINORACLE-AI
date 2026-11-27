"""Conversational What-If Scenario Simulator.

Extracts structured scenario parameters from natural language (via configured LLM
or deterministic regex parser fallback), checks for missing essential inputs, and
delegates ALL math strictly to pure deterministic Python functions.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from backend.config import get_settings
from backend.llm.provider import LLMNotConfiguredError, LLMProviderError, get_llm_provider
from backend.services.finance_math import (
    compute_monthly_aggregates,
    evaluate_affordability,
    format_inr,
    simulate_advanced_scenario,
)


class ExtractedScenarioParams(BaseModel):
    salary_decrease_percent: Optional[float] = Field(default=None, ge=0, le=100)
    salary_increase_percent: Optional[float] = Field(default=None, ge=0, le=500)
    salary_change_amount: Optional[float] = Field(default=None)
    income_loss_months: Optional[int] = Field(default=None, ge=0, le=12)
    lump_sum_purchase_amount: Optional[float] = Field(default=None, ge=0)
    lump_sum_purchase_label: Optional[str] = None
    monthly_savings_increase: Optional[float] = Field(default=None, ge=0)
    category_expense_reduction_amount: Optional[float] = Field(default=None, ge=0)
    category_expense_reduction_category: Optional[str] = None
    monthly_expense_increase: Optional[float] = Field(default=None, ge=0)
    new_loan_emi: Optional[float] = Field(default=None, ge=0)
    missing_fields: List[str] = Field(default_factory=list)


def _parse_amount(raw: str) -> float:
    cleaned = raw.replace(",", "").strip().lower()
    if cleaned.endswith("k"):
        return float(cleaned[:-1]) * 1_000.0
    if cleaned.endswith("l") or "lakh" in cleaned:
        num = re.sub(r"[^0-9.]", "", cleaned)
        return float(num) * 1_00_000.0
    if cleaned.endswith("cr") or "crore" in cleaned:
        num = re.sub(r"[^0-9.]", "", cleaned)
        return float(num) * 1_00_00_000.0
    return float(re.sub(r"[^0-9.]", "", cleaned))


def _regex_extract_scenario(message: str) -> ExtractedScenarioParams:
    lower = message.lower()
    params = ExtractedScenarioParams()

    pct_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:%|percent)", lower)
    amt_match = re.search(
        r"(?:₹|rs\.?\s*|inr\s*)([\d,]+(?:\.\d+)?(?:\s*(?:k|l|lakh|lakhs|cr|crore)\b)?)",
        lower,
    )
    bare_k_match = re.search(r"\b(\d+(?:\.\d+)?)\s*(k|lakh|lakhs)\b", lower)
    months_match = re.search(r"(\d+)\s*(?:month|months|mo)\b", lower)

    extracted_amt: Optional[float] = None
    if amt_match:
        try:
            extracted_amt = _parse_amount(amt_match.group(1))
        except Exception:
            extracted_amt = None
    elif bare_k_match:
        try:
            extracted_amt = _parse_amount(bare_k_match.group(1) + bare_k_match.group(2))
        except Exception:
            extracted_amt = None

    # 1. Income loss for N months
    if any(k in lower for k in ("lose my job", "job loss", "income loss", "no income", "without income", "unemployed")):
        if months_match:
            params.income_loss_months = min(12, max(1, int(months_match.group(1))))
        else:
            params.missing_fields.append("duration_months")

    # 2. Salary / income percentage decrease or increase
    elif any(k in lower for k in ("income", "salary", "pay")) and any(
        k in lower for k in ("decrease", "drop", "cut", "fall", "reduce", "less", "lower")
    ):
        if pct_match:
            params.salary_decrease_percent = float(pct_match.group(1))
        elif extracted_amt is not None:
            params.salary_change_amount = -abs(extracted_amt)
        else:
            params.missing_fields.append("salary_decrease_percent_or_amount")

    elif any(k in lower for k in ("income", "salary", "hike", "raise", "increment", "promotion")) and any(
        k in lower for k in ("increase", "hike", "raise", "increment", "bump", "more", "promotion")
    ):
        if pct_match:
            params.salary_increase_percent = float(pct_match.group(1))
        elif extracted_amt is not None:
            params.salary_change_amount = abs(extracted_amt)
        else:
            params.missing_fields.append("salary_increase_percent_or_amount")

    # 3. Lump-sum purchase / affordability
    if any(k in lower for k in ("afford", "buy", "purchase", "laptop", "phone", "iphone", "bike", "car", "macbook", "trip", "vacation", "down payment")):
        if extracted_amt is not None:
            params.lump_sum_purchase_amount = extracted_amt
            item_match = re.search(r"(?:laptop|macbook|phone|iphone|bike|car|tv|trip|vacation|watch|camera|down payment)", lower)
            params.lump_sum_purchase_label = (
                item_match.group(0).title() if item_match else "Lump-sum purchase"
            )
        else:
            params.missing_fields.append("purchase_amount")

    # 4. Recurring monthly savings increase
    if any(k in lower for k in ("save", "saving", "savings", "sip")) and any(
        k in lower for k in ("more", "extra", "additional", "increase", "per month", "/month", "monthly", "+")
    ):
        if extracted_amt is not None:
            params.monthly_savings_increase = extracted_amt
        else:
            params.missing_fields.append("monthly_savings_amount")

    # 5. Category expense reduction
    if any(k in lower for k in ("cut", "reduce", "trim", "lower", "spend less")) and not any(
        k in lower for k in ("income", "salary", "pay")
    ):
        if extracted_amt is not None:
            params.category_expense_reduction_amount = extracted_amt
            cat_match = re.search(
                r"\b(food|dining|groceries|transport|shopping|education|healthcare|utilities|housing|entertainment|travel)\b",
                lower,
            )
            params.category_expense_reduction_category = (
                cat_match.group(1).title() if cat_match else "Discretionary"
            )
        else:
            params.missing_fields.append("expense_reduction_amount")

    # 6. EMI / recurring expense increase
    if "emi" in lower and extracted_amt is not None:
        params.new_loan_emi = extracted_amt

    return params


def _llm_extract_scenario(message: str) -> Optional[ExtractedScenarioParams]:
    if not get_settings().is_llm_configured:
        return None
    try:
        provider = get_llm_provider()
        system_prompt = (
            "Extract financial what-if scenario parameters from the user's message into strict JSON. "
            "Return ONLY a JSON object matching these optional keys (use null when not stated): "
            "salary_decrease_percent (0-100), salary_increase_percent, salary_change_amount (signed INR), "
            "income_loss_months (1-12), lump_sum_purchase_amount (INR), lump_sum_purchase_label, "
            "monthly_savings_increase (INR), category_expense_reduction_amount (INR), "
            "category_expense_reduction_category, monthly_expense_increase (INR), new_loan_emi (INR), "
            "missing_fields (list of strings for any essential value mentioned without a number). "
            "Do NOT calculate results or invent amounts."
        )
        raw = provider.generate_text(system_prompt=system_prompt, user_prompt=message, temperature=0.0)
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        data = json.loads(cleaned)
        return ExtractedScenarioParams.model_validate(data)
    except (LLMNotConfiguredError, LLMProviderError, Exception):
        return None


def run_conversational_scenario(
    message: str,
    transactions: List[Dict[str, Any]],
    profile: Dict[str, Any],
    goals: List[Dict[str, Any]],
    override_baseline_income: Optional[float] = None,
    override_baseline_expenses: Optional[float] = None,
) -> Dict[str, Any]:
    """Parse natural-language scenario, guard missing info, and compute deterministic outputs."""
    monthly = compute_monthly_aggregates(transactions)
    latest = monthly[-1] if monthly else None

    db_income = (
        latest["income"]
        if latest and latest["income"] > 0
        else float(profile.get("monthly_income") or 0.0)
    )
    db_expenses = latest["expenses"] if latest else 0.0

    base_income = (
        float(override_baseline_income)
        if override_baseline_income is not None and override_baseline_income > 0
        else db_income
    )
    base_expenses = (
        float(override_baseline_expenses)
        if override_baseline_expenses is not None and override_baseline_expenses > 0
        else db_expenses
    )
    existing_savings = sum(float(g.get("current_amount") or 0.0) for g in goals)

    # Extract scenario parameters (LLM first if configured, else deterministic regex)
    extracted = _llm_extract_scenario(message)
    extraction_mode = "llm_structured_extraction" if extracted is not None else "deterministic_parser"
    if extracted is None:
        extracted = _regex_extract_scenario(message)

    changes: List[Dict[str, Any]] = []
    assumptions: List[str] = []
    follow_up_questions: List[str] = []

    # Check if baseline financial state is completely missing
    if base_income <= 0 and base_expenses <= 0:
        follow_up_questions.append(
            "Your account has no recorded monthly income or expenses yet. Please provide your current monthly income and expenses (or record transactions first) so I can compute an accurate simulation."
        )

    if extracted.salary_decrease_percent is not None:
        if base_income <= 0:
            follow_up_questions.append(
                f"To simulate a {extracted.salary_decrease_percent:.0f}% income decrease, what is your current monthly income in ₹?"
            )
        else:
            drop = round(base_income * (extracted.salary_decrease_percent / 100.0), 2)
            changes.append(
                {
                    "type": "income_decrease",
                    "label": f"Salary decrease (-{extracted.salary_decrease_percent:.1f}%)",
                    "amount": drop,
                }
            )
            assumptions.append(
                f"Monthly income reduced by {extracted.salary_decrease_percent:.1f}% ({format_inr(drop)}/month) from {format_inr(base_income)}."
            )

    if extracted.salary_increase_percent is not None:
        if base_income <= 0:
            follow_up_questions.append(
                f"To simulate a {extracted.salary_increase_percent:.0f}% salary hike, what is your current monthly income in ₹?"
            )
        else:
            inc = round(base_income * (extracted.salary_increase_percent / 100.0), 2)
            changes.append(
                {
                    "type": "income_increase",
                    "label": f"Salary increase (+{extracted.salary_increase_percent:.1f}%)",
                    "amount": inc,
                }
            )
            assumptions.append(
                f"Monthly income increased by {extracted.salary_increase_percent:.1f}% (+{format_inr(inc)}/month)."
            )

    if extracted.salary_change_amount is not None:
        if extracted.salary_change_amount < 0:
            amt = abs(extracted.salary_change_amount)
            changes.append({"type": "income_decrease", "label": "Monthly income reduction", "amount": amt})
            assumptions.append(f"Monthly income reduced by {format_inr(amt)}/month.")
        elif extracted.salary_change_amount > 0:
            amt = extracted.salary_change_amount
            changes.append({"type": "income_increase", "label": "Monthly income addition", "amount": amt})
            assumptions.append(f"Monthly income increased by {format_inr(amt)}/month.")

    income_loss_months = int(extracted.income_loss_months or 0)
    if income_loss_months > 0:
        assumptions.append(
            f"Zero monthly income modeled for the first {income_loss_months} month(s), while monthly expenses ({format_inr(base_expenses)}) continue."
        )

    affordability = None
    if extracted.lump_sum_purchase_amount is not None and extracted.lump_sum_purchase_amount > 0:
        label = extracted.lump_sum_purchase_label or "Lump-sum purchase"
        changes.append(
            {
                "type": "one_time_expense",
                "label": label,
                "amount": float(extracted.lump_sum_purchase_amount),
            }
        )
        assumptions.append(
            f"One-time capital outflow of {format_inr(extracted.lump_sum_purchase_amount)} for {label} deducted in Month 1."
        )
        if base_income > 0 or base_expenses > 0:
            affordability = evaluate_affordability(
                purchase_amount=float(extracted.lump_sum_purchase_amount),
                monthly_income=base_income,
                monthly_expenses=base_expenses,
                liquid_savings=existing_savings,
            )

    if extracted.monthly_savings_increase is not None and extracted.monthly_savings_increase > 0:
        changes.append(
            {
                "type": "savings_increase",
                "label": "Additional monthly savings allocation",
                "amount": float(extracted.monthly_savings_increase),
            }
        )
        assumptions.append(
            f"Additional recurring monthly savings commitment of {format_inr(extracted.monthly_savings_increase)}/month evaluated against net cash flow."
        )

    if (
        extracted.category_expense_reduction_amount is not None
        and extracted.category_expense_reduction_amount > 0
    ):
        cat = extracted.category_expense_reduction_category or "Discretionary"
        changes.append(
            {
                "type": "expense_decrease",
                "label": f"Reduce {cat} spending",
                "amount": float(extracted.category_expense_reduction_amount),
            }
        )
        assumptions.append(
            f"Monthly {cat} expenses reduced by {format_inr(extracted.category_expense_reduction_amount)}/month."
        )

    if extracted.monthly_expense_increase is not None and extracted.monthly_expense_increase > 0:
        changes.append(
            {
                "type": "expense_increase",
                "label": "Monthly expense increase",
                "amount": float(extracted.monthly_expense_increase),
            }
        )

    if extracted.new_loan_emi is not None and extracted.new_loan_emi > 0:
        changes.append(
            {
                "type": "new_loan_emi",
                "label": "New monthly loan EMI",
                "amount": float(extracted.new_loan_emi),
            }
        )

    # Translate missing parameter hints into clear, concise follow-up questions
    for field_name in extracted.missing_fields:
        if field_name == "duration_months":
            follow_up_questions.append("How many months of income loss would you like to simulate (e.g., 2, 3, or 6 months)?")
        elif field_name == "purchase_amount":
            follow_up_questions.append("What is the exact price (in ₹) of the purchase you want to evaluate?")
        elif field_name == "salary_decrease_percent_or_amount":
            follow_up_questions.append("By what percentage or ₹ amount would your monthly income decrease?")
        elif field_name == "salary_increase_percent_or_amount":
            follow_up_questions.append("By what percentage or ₹ amount would your monthly income increase?")
        elif field_name == "monthly_savings_amount":
            follow_up_questions.append("How much extra (in ₹/month) do you plan to save each month?")
        elif field_name == "expense_reduction_amount":
            follow_up_questions.append("How much (in ₹/month) do you want to reduce from that expense category?")

    if not changes and income_loss_months == 0 and not follow_up_questions:
        follow_up_questions.append(
            "Please specify a concrete change—for example: a salary drop percentage ('income decreases by 20%'), "
            "income loss duration ('lose income for 3 months'), a purchase price ('₹45,000 laptop'), "
            "extra monthly savings ('save ₹5,000 more/month'), or a category cut ('reduce food by ₹2,000')."
        )

    needs_clarification = len(follow_up_questions) > 0 and (
        (not changes and income_loss_months == 0) or (base_income <= 0 and base_expenses <= 0)
    )

    if needs_clarification:
        return {
            "needs_clarification": True,
            "extraction_mode": extraction_mode,
            "follow_up_questions": follow_up_questions,
            "missing_information": follow_up_questions,
            "parsed_changes": changes,
            "current_position": {
                "monthly_income": round(base_income, 2),
                "monthly_expenses": round(base_expenses, 2),
                "monthly_savings": round(base_income - base_expenses, 2),
                "existing_goal_savings": round(existing_savings, 2),
            },
            "assumptions": [],
            "simulation": None,
            "affordability": None,
        }

    baseline_note = (
        f"Current position anchored to {latest['month']} recorded transactions"
        if override_baseline_income is None and latest
        else "Current position anchored to provided/profile baseline"
    )
    assumptions.insert(0, f"{baseline_note} (Income: {format_inr(base_income)}/mo, Expenses: {format_inr(base_expenses)}/mo).")
    if existing_savings > 0:
        assumptions.append(f"Existing goal savings buffer of {format_inr(existing_savings)} included in runway/liquidity checks.")

    simulation = simulate_advanced_scenario(
        baseline_income=base_income,
        baseline_expenses=base_expenses,
        changes=changes,
        income_loss_months=income_loss_months,
        existing_savings=existing_savings,
        horizon_months=12,
    )

    return {
        "needs_clarification": False,
        "extraction_mode": extraction_mode,
        "follow_up_questions": [],
        "missing_information": [],
        "parsed_changes": changes,
        "income_loss_months": income_loss_months,
        "current_position": {
            "monthly_income": round(base_income, 2),
            "monthly_expenses": round(base_expenses, 2),
            "monthly_savings": round(base_income - base_expenses, 2),
            "existing_goal_savings": round(existing_savings, 2),
        },
        "assumptions": assumptions,
        "affordability": affordability,
        "simulation": simulation,
    }
