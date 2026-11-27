"""Full User-Scoped REST CRUD & Deterministic Dashboard Aggregation Router (SQLite)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.auth.security import require_current_user
from backend.services.data_access import UserDataAccess
from backend.services.finance_math import (
    compute_category_breakdown,
    compute_monthly_aggregates,
    compute_period_summary,
    format_inr,
)

router = APIRouter(tags=["Financial Data CRUD"])


# ---- Pydantic Schemas ----
class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    occupation: Optional[str] = None
    income_mode: Optional[str] = None
    income_value: Optional[float] = Field(default=None, ge=0)
    monthly_income: Optional[float] = Field(default=None, ge=0)
    income_type: Optional[str] = None
    additional_income_sources: Optional[List[Dict[str, Any]]] = None
    planning_period_start_day: Optional[int] = Field(default=None, ge=1, le=28)
    currency: Optional[str] = None
    primary_goal: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class TransactionCreateRequest(BaseModel):
    type: str = Field(..., pattern="^(income|expense)$")
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    title: Optional[str] = None
    merchant: Optional[str] = None
    date: str = Field(..., min_length=8, max_length=20)
    payment_method: Optional[str] = "UPI"
    notes: Optional[str] = ""
    is_recurring: Optional[bool] = False


class TransactionUpdateRequest(BaseModel):
    type: Optional[str] = Field(default=None, pattern="^(income|expense)$")
    amount: Optional[float] = Field(default=None, gt=0)
    category: Optional[str] = None
    description: Optional[str] = None
    title: Optional[str] = None
    merchant: Optional[str] = None
    date: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class BulkTransactionRequest(BaseModel):
    transactions: List[TransactionCreateRequest] = Field(..., min_length=1, max_length=500)


class BudgetCategoryItem(BaseModel):
    category: str
    limit_amount: float = Field(..., ge=0)


class BudgetCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    month: str = Field(..., min_length=7, max_length=7)
    planned_income: Optional[float] = Field(default=0.0, ge=0)
    total_limit: float = Field(..., ge=0)
    categories: List[BudgetCategoryItem] = Field(default_factory=list)


class BudgetUpdateRequest(BaseModel):
    name: Optional[str] = None
    month: Optional[str] = None
    planned_income: Optional[float] = Field(default=None, ge=0)
    total_limit: Optional[float] = Field(default=None, ge=0)
    categories: Optional[List[BudgetCategoryItem]] = None


class GoalCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    description: Optional[str] = ""
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(default=0.0, ge=0)
    target_date: str
    monthly_contribution: float = Field(default=0.0, ge=0)
    icon: Optional[str] = ""
    color: Optional[str] = "#159B72"


class GoalUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[float] = Field(default=None, gt=0)
    current_amount: Optional[float] = Field(default=None, ge=0)
    target_date: Optional[str] = None
    monthly_contribution: Optional[float] = Field(default=None, ge=0)
    status: Optional[str] = None
    color: Optional[str] = None


class GoalContributeRequest(BaseModel):
    amount: float = Field(..., gt=0)


class LoanCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    principal: float = Field(..., gt=0)
    interest_rate: float = Field(..., gt=0, le=100)
    tenure_months: int = Field(..., gt=0, le=600)
    emi: float = Field(..., gt=0)


class ScenarioCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    description: Optional[str] = ""
    baseline: Dict[str, Any] = Field(default_factory=dict)
    modified: Dict[str, Any] = Field(default_factory=dict)
    impact: Dict[str, Any] = Field(default_factory=dict)


# ---- Profile ----
@router.get("/profile")
async def get_profile(auth: Dict[str, str] = Depends(require_current_user)):
    return UserDataAccess(user_id=auth["user_id"]).get_profile()


@router.put("/profile")
async def upsert_profile(
    request: ProfileUpdateRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(user_id=auth["user_id"])
    updated = da.update_profile(request.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return updated


# ---- Transactions ----
@router.get("/transactions")
async def list_transactions(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=200),
    type: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query(default="date"),
    sort_order: str = Query(default="desc"),
    auth: Dict[str, str] = Depends(require_current_user),
):
    txs = UserDataAccess(user_id=auth["user_id"]).get_transactions(limit=5000)
    if type:
        txs = [t for t in txs if t["type"] == type]
    if category:
        txs = [t for t in txs if t["category"].lower() == category.lower()]
    if start_date:
        txs = [t for t in txs if t["date"] >= start_date]
    if end_date:
        txs = [t for t in txs if t["date"] <= end_date]
    if search:
        q = search.lower()
        txs = [t for t in txs if q in t["description"].lower() or q in t["category"].lower()]

    reverse = sort_order.lower() != "asc"
    if sort_by == "amount":
        txs.sort(key=lambda t: t["amount"], reverse=reverse)
    else:
        txs.sort(key=lambda t: (t["date"], t["created_at"]), reverse=reverse)

    total = len(txs)
    start_idx = (page - 1) * per_page
    paged = txs[start_idx : start_idx + per_page]
    total_pages = (total + per_page - 1) // per_page if total else 0
    return {
        "data": paged,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


@router.get("/transactions/summary")
async def get_transactions_summary(
    start_date: str,
    end_date: str,
    auth: Dict[str, str] = Depends(require_current_user),
):
    txs = UserDataAccess(user_id=auth["user_id"]).get_transactions(limit=5000)
    filtered = [t for t in txs if start_date <= t["date"] <= end_date]
    summary = compute_period_summary(filtered)
    bd = compute_category_breakdown(filtered)
    return {
        "income": summary["income"],
        "expenses": summary["expenses"],
        "savings": summary["net_cash_flow"],
        "spendingByCategory": [
            {"category": c["category"], "amount": c["amount"], "color": "#D65A50"}
            for c in bd["categories"]
        ],
    }


@router.post("/transactions")
async def create_transaction(
    request: TransactionCreateRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    return UserDataAccess(user_id=auth["user_id"]).create_transaction(request.model_dump())


@router.post("/transactions/bulk")
async def bulk_create_transactions(
    request: BulkTransactionRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(user_id=auth["user_id"])
    created = [da.create_transaction(item.model_dump()) for item in request.transactions]
    return {"data": created, "count": len(created)}


@router.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    request: TransactionUpdateRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    updated = UserDataAccess(user_id=auth["user_id"]).update_transaction(
        transaction_id, request.model_dump(exclude_none=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return updated


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    auth: Dict[str, str] = Depends(require_current_user),
):
    ok = UserDataAccess(user_id=auth["user_id"]).delete_transaction(transaction_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return {"deleted": True}


# ---- Budgets ----
@router.get("/budgets")
async def list_budgets(auth: Dict[str, str] = Depends(require_current_user)):
    return UserDataAccess(user_id=auth["user_id"]).get_budgets()


@router.post("/budgets")
async def create_budget(
    request: BudgetCreateRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    return UserDataAccess(user_id=auth["user_id"]).create_or_upsert_budget(request.model_dump())


@router.put("/budgets/{budget_id}")
async def update_budget(
    budget_id: str,
    request: BudgetUpdateRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    updated = UserDataAccess(user_id=auth["user_id"]).update_budget(
        budget_id, request.model_dump(exclude_none=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Budget not found.")
    return updated


@router.delete("/budgets/{budget_id}")
async def delete_budget(
    budget_id: str,
    auth: Dict[str, str] = Depends(require_current_user),
):
    ok = UserDataAccess(user_id=auth["user_id"]).delete_budget(budget_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Budget not found.")
    return {"deleted": True}


# ---- Goals ----
@router.get("/goals")
async def list_goals(auth: Dict[str, str] = Depends(require_current_user)):
    return UserDataAccess(user_id=auth["user_id"]).get_goals()


@router.post("/goals")
async def create_goal(
    request: GoalCreateRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    return UserDataAccess(user_id=auth["user_id"]).create_goal(request.model_dump())


@router.put("/goals/{goal_id}")
async def update_goal(
    goal_id: str,
    request: GoalUpdateRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    updated = UserDataAccess(user_id=auth["user_id"]).update_goal(
        goal_id, request.model_dump(exclude_none=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Goal not found.")
    return updated


@router.post("/goals/{goal_id}/contribute")
async def contribute_goal(
    goal_id: str,
    request: GoalContributeRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    updated = UserDataAccess(user_id=auth["user_id"]).contribute_goal(goal_id, request.amount)
    if not updated:
        raise HTTPException(status_code=404, detail="Goal not found.")
    return updated


@router.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: str,
    auth: Dict[str, str] = Depends(require_current_user),
):
    ok = UserDataAccess(user_id=auth["user_id"]).delete_goal(goal_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Goal not found.")
    return {"deleted": True}


# ---- Saved Loans ----
@router.get("/loans")
async def list_loans(auth: Dict[str, str] = Depends(require_current_user)):
    return UserDataAccess(user_id=auth["user_id"]).get_loans()


@router.post("/loans")
async def create_loan(
    request: LoanCreateRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    return UserDataAccess(user_id=auth["user_id"]).create_loan(request.model_dump())


@router.delete("/loans/{loan_id}")
async def delete_loan(
    loan_id: str,
    auth: Dict[str, str] = Depends(require_current_user),
):
    ok = UserDataAccess(user_id=auth["user_id"]).delete_loan(loan_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Loan not found.")
    return {"deleted": True}


# ---- Saved Scenarios ----
@router.get("/scenarios")
async def list_scenarios(auth: Dict[str, str] = Depends(require_current_user)):
    return UserDataAccess(user_id=auth["user_id"]).get_scenarios()


@router.post("/scenarios")
async def create_scenario(
    request: ScenarioCreateRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    return UserDataAccess(user_id=auth["user_id"]).create_scenario(request.model_dump())


@router.delete("/scenarios/{scenario_id}")
async def delete_scenario(
    scenario_id: str,
    auth: Dict[str, str] = Depends(require_current_user),
):
    ok = UserDataAccess(user_id=auth["user_id"]).delete_scenario(scenario_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Scenario not found.")
    return {"deleted": True}


# ---- Dashboard Aggregation ----
@router.get("/dashboard")
async def get_dashboard(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(user_id=auth["user_id"])
    profile = da.get_profile() or {}
    all_txs = da.get_transactions(limit=5000)
    budgets = da.get_budgets()
    goals = da.get_goals()

    today = date.today()
    cur_month = today.strftime("%Y-%m")
    range_start = start_date or f"{cur_month}-01"
    range_end = end_date or today.isoformat()

    period_txs = [t for t in all_txs if range_start <= t["date"] <= range_end]
    summary = compute_period_summary(period_txs)
    bd = compute_category_breakdown(period_txs)

    palette = ["#159B72", "#0D7A59", "#172B4D", "#334155", "#64748B", "#D65A50", "#B45309"]
    spending_by_category = [
        {
            "category": c["category"],
            "amount": c["amount"],
            "percentage": round(c["percentage"]),
            "color": palette[idx % len(palette)],
        }
        for idx, c in enumerate(bd["categories"])
    ]

    monthly = compute_monthly_aggregates(all_txs)
    income_vs_expenses = []
    savings_trend = []
    for row in monthly:
        try:
            dt = datetime.strptime(row["month"] + "-01", "%Y-%m-%d")
            label = dt.strftime("%b")
        except Exception:
            label = row["month"]
        income_vs_expenses.append(
            {"month": label, "income": row["income"], "expenses": row["expenses"]}
        )
        savings_trend.append({"month": label, "savings": row["net_savings"]})

    active_budget = next((b for b in budgets if b["month"] == cur_month), budgets[0] if budgets else None)
    total_budget_allocated = active_budget["total_limit"] if active_budget else 0.0
    budget_utilization = (
        (summary["expenses"] / total_budget_allocated) * 100.0
        if total_budget_allocated > 0
        else 0.0
    )

    cat_spent_map = {c["category"]: c["amount"] for c in bd["categories"]}
    category_budgets = []
    if active_budget:
        for c in active_budget.get("categories", []):
            spent = cat_spent_map.get(c["category"], 0.0)
            lim = float(c["limit_amount"])
            category_budgets.append(
                {
                    "category": c["category"],
                    "limit": lim,
                    "spent": spent,
                    "utilization": (spent / lim * 100.0) if lim > 0 else 0.0,
                }
            )

    recent_txs = sorted(all_txs, key=lambda t: (t["date"], t["created_at"]), reverse=True)[:6]

    insights = []
    if summary["income"] > 0 and summary["expenses"] > 0:
        if summary["net_cash_flow"] < 0:
            insights.append(
                {
                    "type": "warning",
                    "title": "Deficit Alert",
                    "message": f"Your outflows ({format_inr(summary['expenses'])}) exceeded recorded inflows by {format_inr(abs(summary['net_cash_flow']))} this period.",
                }
            )
        elif summary["savings_rate"] >= 20:
            insights.append(
                {
                    "type": "positive",
                    "title": "Disciplined Capital Retention",
                    "message": f"You retained {summary['savings_rate']:.1f}% of your income this period, exceeding the 20% benchmark.",
                }
            )

    planned_income = float(profile.get("monthly_income") or 0.0)
    has_data = bool(all_txs or budgets or goals or planned_income > 0)

    return {
        "planned_monthly_income": planned_income,
        "actual_income": summary["income"],
        "total_income": summary["income"],
        "total_expenses": summary["expenses"],
        "net_cash_flow": summary["net_cash_flow"],
        "savings": summary["savings"],
        "savings_rate": max(0.0, min(100.0, summary["savings_rate"])),
        "total_budget_allocated": total_budget_allocated,
        "budget_utilization": round(budget_utilization, 2),
        "has_data": has_data,
        "recent_transactions": recent_txs,
        "spending_by_category": spending_by_category,
        "income_vs_expenses": income_vs_expenses,
        "savings_trend": savings_trend,
        "category_budgets": category_budgets,
        "active_goals": goals,
        "insights": insights,
    }


# ---- Sample Indian Ledger (explicitly tagged demo data, one-click load / clear) ----
@router.get("/sample-data/status")
async def sample_data_status(auth: Dict[str, str] = Depends(require_current_user)):
    da = UserDataAccess(user_id=auth["user_id"])
    total = da.count_transactions()
    sample = da.count_sample_transactions()
    return {
        "total_count": total,
        "sample_count": sample,
        "real_count": total - sample,
        "can_load_sample": (total - sample) == 0,
    }


@router.post("/sample-data/load")
async def load_sample_data(auth: Dict[str, str] = Depends(require_current_user)):
    from backend.services.sample_data import build_sample_ledger

    da = UserDataAccess(user_id=auth["user_id"])
    total = da.count_transactions()
    sample = da.count_sample_transactions()
    if total - sample > 0:
        raise HTTPException(
            status_code=409,
            detail="Sample data can only be loaded into an account with no real transactions. Your real data was not modified.",
        )
    if sample > 0:
        da.delete_sample_data()  # idempotent reload

    ledger = build_sample_ledger()
    for tx in ledger["transactions"]:
        da.create_transaction(tx)

    budget_created = False
    if not any(b.get("month") == ledger["budget"]["month"] for b in da.get_budgets()):
        da.create_or_upsert_budget(ledger["budget"])
        budget_created = True
    da.create_goal(ledger["goal"])

    return {
        "loaded": True,
        "transactions_created": len(ledger["transactions"]),
        "budget_created": budget_created,
        "goal_created": True,
        "message": "Sample Indian ledger (3 full months + current month) loaded and tagged as sample data.",
    }


@router.delete("/sample-data")
async def clear_sample_data(auth: Dict[str, str] = Depends(require_current_user)):
    removed = UserDataAccess(user_id=auth["user_id"]).delete_sample_data()
    return {"cleared": True, **removed}
