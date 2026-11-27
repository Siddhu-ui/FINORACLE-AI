"""Tool-Calling LLM Financial Copilot Orchestrator with Rich Deterministic Synthesis Fallback."""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List

from backend.config import get_settings
from backend.llm.provider import (
    LLMNotConfiguredError,
    LLMProviderError,
    get_llm_provider,
)
from backend.llm.tools import AuthenticatedToolExecutor, get_tool_json_schemas
from backend.services.data_access import UserDataAccess
from backend.services.finance_math import format_inr

logger = logging.getLogger("finoracle.copilot")

COPILOT_SYSTEM_PROMPT = (
    "You are FinOracle AI, an Indian Personal Finance Copilot. "
    "You MUST use the provided backend tools to fetch the authenticated user's verified financial data, "
    "ML forecasts, unusual spending alerts, deterministic scenario simulations, and official Indian "
    "financial knowledge (RBI, SEBI, AMFI, NCFE, Income Tax, PFRDA).\n\n"
    "STRICT GUARDRAILS:\n"
    "1. NEVER perform mental arithmetic or fabricate monetary figures—quote the exact INR (₹) values "
    "returned by the deterministic backend tools.\n"
    "2. Use Indian number formatting (₹, Lakhs/Crores) and Indian context (UPI, SIP, ELSS, NAV, Section 80C).\n"
    "3. For expense forecasts, if the tool returns `insufficient_data`, clearly explain how many more full months "
    "are required—never guess or extrapolate.\n"
    "4. Always label anomalies as 'Unusual Spending'—never claim confirmed fraud.\n"
    "5. For conceptual Indian finance questions (SIP, Mutual Funds, NAV, Expense Ratio, ELSS, Taxes, etc.), "
    "call `retrieve_financial_knowledge` and cite only the retrieved official sources. If sufficient verified "
    "information is unavailable, explicitly state so.\n"
    "6. Keep answers clear, structured with bullet points, and end with a brief educational disclaimer."
)


def _route_deterministic_tools_fallback(
    message: str, executor: AuthenticatedToolExecutor
) -> List[Dict[str, Any]]:
    """Run strictly relevant deterministic backend tools when the LLM is unavailable."""
    lower = message.lower()
    planned: List[tuple[str, Dict[str, Any]]] = []

    rupee_match = re.search(r"(?:₹|rs\.?|inr\s*)\s*([\d,]+(?:\.\d+)?)", lower)
    pct_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:%|percent)", lower)
    months_match = re.search(r"(\d+)\s*month", lower)

    if any(k in lower for k in ("afford", "laptop", "buy", "purchase")) and rupee_match:
        amt = float(rupee_match.group(1).replace(",", ""))
        planned.append(("run_financial_scenario", {"scenario_type": "lump_sum_purchase", "amount": amt}))
    elif any(k in lower for k in ("income decrease", "salary decrease", "pay cut", "income drops", "decreases by")) and pct_match:
        pct = float(pct_match.group(1))
        planned.append(("run_financial_scenario", {"scenario_type": "salary_decrease_percent", "percent_change": pct}))
    elif any(k in lower for k in ("lose my job", "income loss", "without income", "no income")):
        dur = int(months_match.group(1)) if months_match else 3
        planned.append(("run_financial_scenario", {"scenario_type": "income_loss_months", "duration_months": dur}))

    if any(k in lower for k in ("predict", "forecast", "next month")):
        planned.append(("get_expense_forecast", {"horizon_months": 3}))
    if any(k in lower for k in ("unusual", "anomaly", "spike", "outlier", "suspicious")):
        planned.append(("get_unusual_spending", {"max_alerts": 8}))
    if any(k in lower for k in ("where", "category", "most of my money", "why did my expenses increase", "expenses increase", "breakdown")):
        planned.append(("get_category_breakdown", {}))
    if any(k in lower for k in ("save", "saved", "income", "expenses", "cash flow", "why did my expenses increase", "expenses increase")):
        planned.append(("get_monthly_income_and_expenses", {}))
    if any(k in lower for k in ("budget", "limit", "burn")):
        planned.append(("get_budget_status", {}))
    if any(k in lower for k in ("goal", "target")):
        planned.append(("get_savings_goals", {}))
    if any(
        k in lower
        for k in (
            "sip",
            "mutual fund",
            "nav",
            "aum",
            "expense ratio",
            "exit load",
            "elss",
            "sebi",
            "rbi",
            "amfi",
            "tax",
            "ltcg",
            "stcg",
            "80c",
            "inflation",
            "compound",
            "emergency fund",
            "nps",
            "diversification",
            "explain",
        )
    ):
        planned.append(("retrieve_financial_knowledge", {"query": message, "top_k": 4}))

    if not planned:
        planned = [
            ("get_monthly_income_and_expenses", {}),
            ("get_category_breakdown", {}),
        ]

    seen = set()
    traces = []
    for name, args in planned:
        if name in seen:
            continue
        seen.add(name)
        res = executor.execute(name, args)
        traces.append({"tool_name": name, "arguments": args, "result": res})
    return traces


def synthesize_deterministic_answer(
    tool_traces: List[Dict[str, Any]],
    citations: List[Dict[str, Any]],
) -> str:
    """Build a clear, ₹-formatted human-readable answer directly from verified tool outputs.

    Used whenever an upstream LLM call fails (quota/429/network) or is unconfigured so the
    user always receives an accurate, immediately actionable summary instead of a blank error.
    """
    sections: List[str] = []

    for trace in tool_traces:
        name = trace.get("tool_name")
        res = trace.get("result") or {}
        if not isinstance(res, dict) or res.get("error"):
            continue

        if name == "get_monthly_income_and_expenses":
            month = res.get("active_month") or "current period"
            cur = res.get("current_period") or {}
            inc = float(cur.get("income") or cur.get("total_income") or 0.0)
            exp = float(cur.get("expenses") or cur.get("total_expenses") or 0.0)
            net = float(cur.get("net_cash_flow") if cur.get("net_cash_flow") is not None else (inc - exp))
            rate = float(cur.get("savings_rate") or 0.0)
            tx_count = int(cur.get("transaction_count") or 0)
            planned = float(res.get("planned_monthly_income_profile") or 0.0)
            mom = res.get("mom_expense_change_percent")
            prev = res.get("previous_month")

            lines = [f"**Cash Flow & Savings Summary ({month})**"]
            if tx_count == 0 and planned > 0:
                lines.append(
                    f"- No transactions are recorded yet for {month}. Your planned monthly income on profile is **{format_inr(planned)}**."
                )
            else:
                lines.append(f"- **Recorded Income:** {format_inr(inc)}")
                lines.append(f"- **Recorded Expenses:** {format_inr(exp)}")
                lines.append(
                    f"- **Net Savings:** {format_inr(net)} (**{rate:.1f}%** savings rate across {tx_count} transaction(s))"
                )
                if inc == 0 and planned > 0:
                    lines.append(
                        f"- **Note:** No income transactions are logged for {month} yet; your profile baseline monthly income is {format_inr(planned)}."
                    )
            if mom is not None and prev:
                direction = "increased" if mom > 0 else "decreased"
                lines.append(
                    f"- **Month-over-Month Expenses:** {direction} by **{abs(float(mom)):.1f}%** compared to {prev.get('month')} ({format_inr(float(prev.get('expenses') or 0.0))})."
                )
            elif int(res.get("monthly_history_count") or 0) < 2:
                lines.append(
                    "- **Month-over-Month Comparison:** Not enough multi-month history yet (record at least 2 months of transactions to compare expense trends)."
                )
            sections.append("\n".join(lines))

        elif name == "get_category_breakdown":
            month = res.get("month") or "current period"
            bd = res.get("breakdown") or {}
            cats = bd.get("categories") or []
            total = float(bd.get("total_expenses") or 0.0)
            deltas = res.get("previous_month_comparison") or []

            lines = [f"**Spending Breakdown by Category ({month})**"]
            if not cats:
                lines.append(f"- No expense transactions recorded for {month} yet.")
            else:
                lines.append(f"- **Total Categorized Expenses:** {format_inr(total)}")
                for item in cats[:5]:
                    lines.append(
                        f"- **{item.get('category')}:** {format_inr(float(item.get('amount') or 0.0))} ({float(item.get('percentage') or 0.0):.1f}%)"
                    )
            if deltas:
                increases = [d for d in deltas if float(d.get("delta") or 0.0) > 0][:3]
                if increases:
                    lines.append("- **Biggest Category Increases vs. Last Month:**")
                    for d in increases:
                        lines.append(
                            f"  - {d.get('category')}: +{format_inr(float(d.get('delta') or 0.0))} "
                            f"({format_inr(float(d.get('previous') or 0.0))} → {format_inr(float(d.get('current') or 0.0))})"
                        )
            sections.append("\n".join(lines))

        elif name == "get_expense_forecast":
            lines = ["**Expense Forecast (Scikit-learn)**"]
            if res.get("status") == "insufficient_data" or not res.get("available"):
                lines.append(
                    f"- {res.get('reason') or 'Insufficient full-month transaction history for forecasting.'} "
                    f"({res.get('months_available', 0)}/{res.get('months_required', 3)} full months available)."
                )
            else:
                preds = res.get("predictions") or []
                for p in preds[:3]:
                    lines.append(
                        f"- **{p.get('month')}:** {format_inr(float(p.get('predicted_expense') or 0.0))} "
                        f"(80% band: {format_inr(float(p.get('lower_bound') or 0.0))} – {format_inr(float(p.get('upper_bound') or 0.0))})"
                    )
                if res.get("mae") is not None and res.get("rmse") is not None:
                    lines.append(
                        f"- **Validation Error:** MAE {format_inr(float(res['mae']))}, RMSE {format_inr(float(res['rmse']))}."
                    )
            sections.append("\n".join(lines))

        elif name == "get_unusual_spending":
            alerts = res.get("alerts") or []
            lines = ["**Unusual Spending Detection**"]
            if not alerts:
                lines.append(
                    f"- {res.get('reason') or 'No unusual spending outliers detected in your recorded expenses.'}"
                )
            else:
                for a in alerts[:4]:
                    lines.append(
                        f"- **{a.get('description')}** ({a.get('category')}, {a.get('date')}): "
                        f"{format_inr(float(a.get('amount') or 0.0))} — {a.get('explanation')}"
                    )
            sections.append("\n".join(lines))

        elif name == "get_budget_status":
            lines = ["**Budget Status**"]
            if not res.get("has_budget"):
                lines.append("- No active budget is configured for this month yet.")
            else:
                lines.append(
                    f"- **Spent vs. Limit:** {format_inr(float(res.get('total_spent') or 0.0))} / "
                    f"{format_inr(float(res.get('total_limit') or 0.0))} ({float(res.get('utilization_percent') or 0.0):.1f}% utilized)"
                )
                overruns = [c for c in (res.get("categories") or []) if c.get("exceeded")]
                for o in overruns[:3]:
                    lines.append(
                        f"- **Over Budget:** {o.get('category')} ({format_inr(float(o.get('spent') or 0.0))} vs. {format_inr(float(o.get('limit') or 0.0))})"
                    )
            sections.append("\n".join(lines))

        elif name == "get_savings_goals":
            goals = res.get("goals") or []
            lines = ["**Savings Goals Progress**"]
            if not goals:
                lines.append("- You don't have any active savings goals yet.")
            else:
                for g in goals[:4]:
                    lines.append(
                        f"- **{g.get('title')}:** {format_inr(float(g.get('current_amount') or 0.0))} / "
                        f"{format_inr(float(g.get('target_amount') or 0.0))} ({float(g.get('progress_percent') or 0.0):.1f}% complete)"
                    )
            sections.append("\n".join(lines))

        elif name == "run_financial_scenario":
            sim = res.get("simulation") or {}
            aff = res.get("affordability")
            lines = ["**Deterministic What-If Scenario Result**"]
            if aff:
                lines.append(
                    f"- **Affordability Verdict ({format_inr(float(aff.get('purchase_amount') or 0.0))}):** "
                    f"**{str(aff.get('verdict') or '').replace('_', ' ').title()}** — {aff.get('reason')}"
                )
            base = sim.get("baseline") or {}
            mod = sim.get("modified") or {}
            impact = sim.get("impact") or {}
            if base and mod:
                lines.append(
                    f"- **Monthly Net Cash Flow:** {format_inr(float(base.get('monthly_savings') or 0.0))} → "
                    f"{format_inr(float(mod.get('monthly_savings') or 0.0))} "
                    f"(Annual impact: {format_inr(float(impact.get('annual_net_difference') or 0.0))})"
                )
                if impact.get("runway_months") is not None:
                    lines.append(f"- **Estimated Runway:** {impact.get('runway_months')} months")
            sections.append("\n".join(lines))

        elif name == "retrieve_financial_knowledge":
            chunks = res.get("chunks") or []
            lines = ["**Grounded Indian Financial Knowledge**"]
            if not res.get("sufficient_context") or not chunks:
                lines.append(
                    "- Sufficient verified information was not found in the local official Indian finance knowledge base for this query."
                )
            else:
                for idx, ch in enumerate(chunks[:3], start=1):
                    lines.append(
                        f"- **[{idx}] {ch.get('source_title')} ({ch.get('organization')}):** {ch.get('chunk_text')}"
                    )
            sections.append("\n".join(lines))

    if not sections:
        sections.append(
            "Verified account data was retrieved from the deterministic backend tools below. "
            "Add transactions, budgets, or goals to unlock deeper cash-flow, category, and forecast insights."
        )

    sections.append(
        "_Note: Figures above are computed deterministically from your recorded FinOracle AI account data for educational purposes and do not constitute personalized financial or tax advice._"
    )
    return "\n\n".join(sections)


def run_copilot_chat(
    session_id: str,
    message: str,
    data_access: UserDataAccess,
    access_token: str,
) -> Dict[str, Any]:
    """Execute the tool-calling AI Financial Copilot strictly scoped to the authenticated user."""
    executor = AuthenticatedToolExecutor(data_access=data_access, access_token=access_token)
    schemas = get_tool_json_schemas()

    try:
        provider = get_llm_provider()
        llm_result = provider.chat_with_tools(
            system_prompt=COPILOT_SYSTEM_PROMPT,
            user_message=message,
            tool_schemas=schemas,
            tool_executor=executor.execute,
            max_rounds=4,
        )
        return {
            "session_id": session_id,
            "llm_configured": True,
            "fallback_used": False,
            "provider": llm_result.provider,
            "model": llm_result.model,
            "response": llm_result.answer,
            "tools_used": [
                {
                    "tool_name": t.tool_name,
                    "arguments": t.arguments,
                    "result": t.result_summary,
                }
                for t in llm_result.tools_used
            ],
            "sources": executor.collected_citations,
        }
    except LLMNotConfiguredError as exc:
        logger.info("Copilot deterministic fallback (LLM unconfigured): %s", exc)
        tool_traces = _route_deterministic_tools_fallback(message, executor)
        return {
            "session_id": session_id,
            "llm_configured": False,
            "fallback_used": True,
            "fallback_reason": exc.short_reason,
            "provider": exc.provider,
            "configuration_error": str(exc),
            "required_env_vars": exc.required_env_vars,
            "response": synthesize_deterministic_answer(tool_traces, executor.collected_citations),
            "tools_used": tool_traces,
            "sources": executor.collected_citations,
        }
    except LLMProviderError as exc:
        logger.warning("Copilot deterministic fallback triggered (%s): %s", exc.short_reason, exc)
        tool_traces = _route_deterministic_tools_fallback(message, executor)
        return {
            "session_id": session_id,
            "llm_configured": True,
            "fallback_used": True,
            "fallback_reason": exc.short_reason,
            "provider": get_settings().llm_provider,
            "provider_error": str(exc),
            "response": synthesize_deterministic_answer(tool_traces, executor.collected_citations),
            "tools_used": tool_traces,
            "sources": executor.collected_citations,
        }
