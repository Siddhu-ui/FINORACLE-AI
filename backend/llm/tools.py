"""Typed, Pydantic-validated, strictly user-scoped LLM tool registry.

Exposes all 9 required financial intelligence tools. Never accepts raw SQL or
arbitrary user_id parameters from the LLM—every tool runs strictly within the
authenticated user's verified Supabase scope.
"""
from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from backend.ml.anomaly import detect_unusual_spending
from backend.ml.forecasting import forecast_monthly_expenses
from backend.rag.retriever import retrieve_knowledge_chunks
from backend.services.data_access import UserDataAccess
from backend.services.finance_math import (
    compute_budget_status,
    compute_category_breakdown,
    compute_monthly_aggregates,
    compute_period_summary,
    evaluate_affordability,
    simulate_advanced_scenario,
)


# ---------------------------------------------------------------------------
# Strict Pydantic Input Schemas (no user_id, no SQL)
# ---------------------------------------------------------------------------
class MonthlyIncomeExpensesArgs(BaseModel):
    month: Optional[str] = Field(
        default=None,
        description="Optional YYYY-MM month filter. Omit for current month or latest recorded month.",
    )


class TransactionSummaryArgs(BaseModel):
    month: Optional[str] = Field(default=None, description="Optional YYYY-MM filter.")
    limit: int = Field(default=10, ge=1, le=50, description="Number of largest/recent transactions to include.")


class CategoryBreakdownArgs(BaseModel):
    month: Optional[str] = Field(default=None, description="Optional YYYY-MM filter.")


class BudgetStatusArgs(BaseModel):
    month: Optional[str] = Field(default=None, description="Optional YYYY-MM month.")


class SavingsGoalsArgs(BaseModel):
    include_completed: bool = Field(default=False, description="Whether to include completed goals.")


class ExpenseForecastArgs(BaseModel):
    horizon_months: int = Field(default=3, ge=1, le=6, description="Number of future months to forecast (1-6).")


class UnusualSpendingArgs(BaseModel):
    max_alerts: int = Field(default=10, ge=1, le=15, description="Maximum unusual spending alerts to return.")


class FinancialScenarioArgs(BaseModel):
    scenario_type: str = Field(
        ...,
        description="One of: salary_decrease_percent, income_loss_months, lump_sum_purchase, monthly_savings_increase, category_expense_reduction, custom",
    )
    percent_change: Optional[float] = Field(default=None, ge=0, le=100, description="Percentage change for salary_decrease_percent.")
    amount: Optional[float] = Field(default=None, ge=0, description="INR amount for lump_sum_purchase, monthly_savings_increase, or category_expense_reduction.")
    duration_months: Optional[int] = Field(default=None, ge=1, le=12, description="Number of months for income_loss_months.")
    category: Optional[str] = Field(default=None, description="Optional expense category for category_expense_reduction.")


class RetrieveKnowledgeArgs(BaseModel):
    query: str = Field(..., min_length=2, max_length=500, description="Indian personal finance topic or question.")
    top_k: int = Field(default=4, ge=1, le=6, description="Number of grounded chunks to retrieve.")


TOOL_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "name": "get_monthly_income_and_expenses",
        "description": "Get the user's verified monthly income, expenses, net savings, savings rate, and month-over-month comparison in INR.",
        "schema": MonthlyIncomeExpensesArgs,
    },
    {
        "name": "get_transaction_summary",
        "description": "Get transaction counts, totals, top expenses, and recent transactions for the user.",
        "schema": TransactionSummaryArgs,
    },
    {
        "name": "get_category_breakdown",
        "description": "Get expense totals and percentage shares broken down by category to answer where money went.",
        "schema": CategoryBreakdownArgs,
    },
    {
        "name": "get_budget_status",
        "description": "Get current budget limits, spending utilization %, burn-rate pacing, and category limit overruns.",
        "schema": BudgetStatusArgs,
    },
    {
        "name": "get_savings_goals",
        "description": "Get the user's financial goals, saved amounts, target amounts, completion percentages, and monthly contributions.",
        "schema": SavingsGoalsArgs,
    },
    {
        "name": "get_expense_forecast",
        "description": "Run the Scikit-learn time-series expense forecast on the user's chronological history with MAE, RMSE, uncertainty band, and insufficient-data guard.",
        "schema": ExpenseForecastArgs,
    },
    {
        "name": "get_unusual_spending",
        "description": "Run Isolation Forest / robust IQR unusual spending detection with human-readable explanations.",
        "schema": UnusualSpendingArgs,
    },
    {
        "name": "run_financial_scenario",
        "description": "Run deterministic What-If simulation and affordability checks (e.g., ₹40,000 laptop purchase, 20% income drop, N-month income loss, monthly savings increase, category cut).",
        "schema": FinancialScenarioArgs,
    },
    {
        "name": "retrieve_financial_knowledge",
        "description": "Retrieve verified authoritative Indian finance knowledge (RBI, SEBI, AMFI, NCFE, Income Tax, PFRDA) on SIP, Mutual Funds, NAV, Expense Ratio, ELSS, Emergency Funds, Taxation, etc.",
        "schema": RetrieveKnowledgeArgs,
    },
]


def get_tool_json_schemas() -> List[Dict[str, Any]]:
    schemas = []
    for item in TOOL_DEFINITIONS:
        raw = item["schema"].model_json_schema()
        # Strip Pydantic metadata keys unsupported by Gemini functionDeclarations
        props = {}
        for k, v in raw.get("properties", {}).items():
            clean_prop: Dict[str, Any] = {"description": v.get("description", "")}
            if "type" in v:
                clean_prop["type"] = v["type"]
            elif "anyOf" in v:
                types = [opt["type"] for opt in v["anyOf"] if opt.get("type") != "null"]
                clean_prop["type"] = types[0] if types else "string"
            else:
                clean_prop["type"] = "string"
            props[k] = clean_prop

        schemas.append(
            {
                "name": item["name"],
                "description": item["description"],
                "parameters": {
                    "type": "object",
                    "properties": props,
                    "required": raw.get("required", []),
                },
            }
        )
    return schemas


class AuthenticatedToolExecutor:
    """Executes the 9 typed tools scoped strictly to the authenticated user."""

    def __init__(self, data_access: UserDataAccess, access_token: Optional[str] = None):
        self.da = data_access
        self.access_token = access_token
        self._tx_cache: Optional[List[Dict[str, Any]]] = None
        self._profile_cache: Optional[Dict[str, Any]] = None
        self._budgets_cache: Optional[List[Dict[str, Any]]] = None
        self._goals_cache: Optional[List[Dict[str, Any]]] = None
        self.collected_citations: List[Dict[str, Any]] = []

    def _transactions(self) -> List[Dict[str, Any]]:
        if self._tx_cache is None:
            self._tx_cache = self.da.get_transactions()
        return self._tx_cache

    def _profile(self) -> Dict[str, Any]:
        if self._profile_cache is None:
            self._profile_cache = self.da.get_profile() or {}
        return self._profile_cache

    def _budgets(self) -> List[Dict[str, Any]]:
        if self._budgets_cache is None:
            self._budgets_cache = self.da.get_budgets()
        return self._budgets_cache

    def _goals(self) -> List[Dict[str, Any]]:
        if self._goals_cache is None:
            self._goals_cache = self.da.get_goals()
        return self._goals_cache

    def _resolve_active_month(self, requested: Optional[str]) -> Optional[str]:
        if requested:
            return requested
        txs = self._transactions()
        cur = date.today().strftime("%Y-%m")
        if any(str(t.get("date") or "").startswith(cur) for t in txs):
            return cur
        monthly = compute_monthly_aggregates(txs)
        return monthly[-1]["month"] if monthly else cur

    def execute(self, tool_name: str, raw_args: Dict[str, Any]) -> Dict[str, Any]:
        tool_map = {t["name"]: t["schema"] for t in TOOL_DEFINITIONS}
        if tool_name not in tool_map:
            return {"error": f"Unknown tool '{tool_name}'."}

        try:
            validated = tool_map[tool_name].model_validate(raw_args or {})
        except Exception as exc:
            return {"error": f"Invalid arguments for {tool_name}: {exc}"}

        if tool_name == "get_monthly_income_and_expenses":
            return self._get_monthly_income_and_expenses(validated)
        if tool_name == "get_transaction_summary":
            return self._get_transaction_summary(validated)
        if tool_name == "get_category_breakdown":
            return self._get_category_breakdown(validated)
        if tool_name == "get_budget_status":
            return self._get_budget_status(validated)
        if tool_name == "get_savings_goals":
            return self._get_savings_goals(validated)
        if tool_name == "get_expense_forecast":
            return self._get_expense_forecast(validated)
        if tool_name == "get_unusual_spending":
            return self._get_unusual_spending(validated)
        if tool_name == "run_financial_scenario":
            return self._run_financial_scenario(validated)
        if tool_name == "retrieve_financial_knowledge":
            return self._retrieve_financial_knowledge(validated)
        return {"error": f"Unhandled tool '{tool_name}'."}

    def _get_monthly_income_and_expenses(self, args: MonthlyIncomeExpensesArgs) -> Dict[str, Any]:
        txs = self._transactions()
        profile = self._profile()
        month = self._resolve_active_month(args.month)
        current = compute_period_summary(txs, month=month)
        monthly_series = compute_monthly_aggregates(txs)

        mom_expense_change_pct: Optional[float] = None
        previous_month: Optional[Dict[str, Any]] = None
        for idx, row in enumerate(monthly_series):
            if row["month"] == month and idx > 0:
                previous_month = monthly_series[idx - 1]
                prev_exp = previous_month["expenses"]
                if prev_exp > 0:
                    mom_expense_change_pct = round(
                        (row["expenses"] - prev_exp) / prev_exp * 100.0, 2
                    )
                break

        return {
            "active_month": month,
            "current_period": current,
            "previous_month": previous_month,
            "mom_expense_change_percent": mom_expense_change_pct,
            "planned_monthly_income_profile": float(profile.get("monthly_income") or 0.0),
            "monthly_history_count": len(monthly_series),
            "recent_months": monthly_series[-6:],
        }

    def _get_transaction_summary(self, args: TransactionSummaryArgs) -> Dict[str, Any]:
        txs = self._transactions()
        month = args.month
        filtered = [t for t in txs if not month or str(t.get("date") or "").startswith(month)]
        expenses = [t for t in filtered if str(t.get("type") or "").lower() == "expense"]
        top_expenses = sorted(expenses, key=lambda x: float(x.get("amount") or 0.0), reverse=True)[: args.limit]
        recent = sorted(filtered, key=lambda x: str(x.get("date") or ""), reverse=True)[: args.limit]

        return {
            "month_filter": month or "all",
            "summary": compute_period_summary(txs, month=month),
            "top_expenses": [
                {
                    "date": t.get("date"),
                    "description": t.get("description"),
                    "category": t.get("category"),
                    "amount": float(t.get("amount") or 0.0),
                }
                for t in top_expenses
            ],
            "recent_transactions": [
                {
                    "date": t.get("date"),
                    "type": t.get("type"),
                    "description": t.get("description"),
                    "category": t.get("category"),
                    "amount": float(t.get("amount") or 0.0),
                }
                for t in recent
            ],
        }

    def _get_category_breakdown(self, args: CategoryBreakdownArgs) -> Dict[str, Any]:
        txs = self._transactions()
        month = self._resolve_active_month(args.month)
        current_bd = compute_category_breakdown(txs, month=month)
        monthly = compute_monthly_aggregates(txs)
        prev_bd = None
        for idx, row in enumerate(monthly):
            if row["month"] == month and idx > 0:
                prev_bd = compute_category_breakdown(txs, month=monthly[idx - 1]["month"])
                break

        # Compute category deltas vs previous month to answer "Why did my expenses increase?"
        category_deltas = []
        if prev_bd:
            prev_map = {c["category"]: c["amount"] for c in prev_bd["categories"]}
            for c in current_bd["categories"]:
                prev_amt = prev_map.get(c["category"], 0.0)
                delta = round(c["amount"] - prev_amt, 2)
                if delta != 0:
                    category_deltas.append(
                        {
                            "category": c["category"],
                            "current": c["amount"],
                            "previous": prev_amt,
                            "delta": delta,
                        }
                    )
            category_deltas.sort(key=lambda x: x["delta"], reverse=True)

        return {
            "month": month,
            "breakdown": current_bd,
            "previous_month_comparison": category_deltas[:6],
        }

    def _get_budget_status(self, args: BudgetStatusArgs) -> Dict[str, Any]:
        return compute_budget_status(
            budgets=self._budgets(),
            transactions=self._transactions(),
            month=args.month,
        )

    def _get_savings_goals(self, args: SavingsGoalsArgs) -> Dict[str, Any]:
        goals = self._goals()
        filtered = [
            g
            for g in goals
            if args.include_completed or str(g.get("status") or "active") in ("active", "paused")
        ]
        formatted = []
        for g in filtered:
            target = float(g.get("target_amount") or 0.0)
            current = float(g.get("current_amount") or 0.0)
            pct = round((current / target) * 100.0, 2) if target > 0 else 0.0
            formatted.append(
                {
                    "title": g.get("title"),
                    "status": g.get("status"),
                    "current_amount": round(current, 2),
                    "target_amount": round(target, 2),
                    "remaining_amount": round(max(0.0, target - current), 2),
                    "progress_percent": pct,
                    "monthly_contribution": float(g.get("monthly_contribution") or 0.0),
                    "target_date": g.get("target_date"),
                }
            )
        return {"total_goals": len(formatted), "goals": formatted}

    def _get_expense_forecast(self, args: ExpenseForecastArgs) -> Dict[str, Any]:
        return forecast_monthly_expenses(
            transactions=self._transactions(),
            horizon_months=args.horizon_months,
        )

    def _get_unusual_spending(self, args: UnusualSpendingArgs) -> Dict[str, Any]:
        result = detect_unusual_spending(self._transactions())
        result["alerts"] = result.get("alerts", [])[: args.max_alerts]
        return result

    def _run_financial_scenario(self, args: FinancialScenarioArgs) -> Dict[str, Any]:
        txs = self._transactions()
        profile = self._profile()
        monthly = compute_monthly_aggregates(txs)
        latest = monthly[-1] if monthly else None

        base_income = (
            latest["income"]
            if latest and latest["income"] > 0
            else float(profile.get("monthly_income") or 0.0)
        )
        base_expenses = latest["expenses"] if latest else 0.0

        goals = self._goals()
        existing_savings = sum(float(g.get("current_amount") or 0.0) for g in goals)

        changes: List[Dict[str, Any]] = []
        income_loss_months = 0
        affordability = None

        if args.scenario_type == "salary_decrease_percent" and args.percent_change is not None:
            drop = round(base_income * (args.percent_change / 100.0), 2)
            changes.append(
                {
                    "type": "income_decrease",
                    "label": f"Income decrease ({args.percent_change:.1f}%)",
                    "amount": drop,
                }
            )
        elif args.scenario_type == "income_loss_months":
            income_loss_months = int(args.duration_months or 1)
        elif args.scenario_type == "lump_sum_purchase" and args.amount is not None:
            changes.append(
                {
                    "type": "one_time_expense",
                    "label": "One-time purchase",
                    "amount": float(args.amount),
                }
            )
            affordability = evaluate_affordability(
                purchase_amount=float(args.amount),
                monthly_income=base_income,
                monthly_expenses=base_expenses,
                liquid_savings=existing_savings,
            )
        elif args.scenario_type == "monthly_savings_increase" and args.amount is not None:
            changes.append(
                {
                    "type": "savings_increase",
                    "label": "Additional monthly savings target",
                    "amount": float(args.amount),
                }
            )
        elif args.scenario_type == "category_expense_reduction" and args.amount is not None:
            changes.append(
                {
                    "type": "expense_decrease",
                    "label": f"Reduce {args.category or 'category'} spending",
                    "amount": float(args.amount),
                }
            )

        sim = simulate_advanced_scenario(
            baseline_income=base_income,
            baseline_expenses=base_expenses,
            changes=changes,
            income_loss_months=income_loss_months,
            existing_savings=existing_savings,
        )
        return {
            "scenario_type": args.scenario_type,
            "baseline_source": "latest_monthly_transactions" if latest else "profile_baseline",
            "simulation": sim,
            "affordability": affordability,
        }

    def _retrieve_financial_knowledge(self, args: RetrieveKnowledgeArgs) -> Dict[str, Any]:
        result = retrieve_knowledge_chunks(
            query=args.query,
            top_k=args.top_k,
            user_access_token=self.access_token,
        )
        for ch in result.get("chunks", []):
            if not any(c["chunk_id"] == ch["chunk_id"] for c in self.collected_citations):
                self.collected_citations.append(ch)
        return result
