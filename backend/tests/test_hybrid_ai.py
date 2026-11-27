"""Comprehensive unit & API tests for Self-Contained FinOracle AI (SQLite + FastAPI JWT + NumPy RAG + ML)."""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

from backend.db.database import init_db
from backend.main import app
from backend.rag.retriever import list_verified_sources, retrieve_knowledge_chunks
from backend.scenarios.simulator import run_conversational_scenario
from backend.services.finance_math import (
    calculate_sip_future_value,
    compute_budget_status,
    evaluate_affordability,
    format_inr,
)


def test_inr_indian_numbering_format():
    assert format_inr(40000) == "₹40,000"
    assert format_inr(150000) == "₹1,50,000"
    assert format_inr(12500000) == "₹1,25,00,000"
    assert format_inr(-2500.5) == "-₹2,500.50"


def test_sip_compounding_math():
    res = calculate_sip_future_value(monthly_investment=10000, annual_return_percent=12, years=15)
    assert res["total_invested"] == 1800000.0
    assert res["future_value"] > 5000000.0
    assert res["wealth_gain"] == round(res["future_value"] - res["total_invested"], 2)


def test_affordability_evaluation():
    res = evaluate_affordability(
        purchase_amount=40000,
        monthly_income=100000,
        monthly_expenses=60000,
        liquid_savings=250000,
    )
    assert res["verdict"] == "affordable_comfortably"
    assert res["months_of_surplus_needed"] == 1.0

    risky = evaluate_affordability(
        purchase_amount=40000,
        monthly_income=40000,
        monthly_expenses=42000,
        liquid_savings=10000,
    )
    assert risky["verdict"] == "not_affordable_now"
    assert len(risky["risk_flags"]) >= 1


def test_budget_burn_rate_status():
    budgets = [
        {
            "name": "Nov Budget",
            "month": "2026-11",
            "total_limit": 50000,
            "budget_categories": [{"category": "Food", "limit_amount": 10000}],
        }
    ]
    txs = [
        {"type": "expense", "date": "2026-11-05", "category": "Food", "amount": 12000},
        {"type": "expense", "date": "2026-11-10", "category": "Housing", "amount": 40000},
    ]
    status = compute_budget_status(budgets, txs, month="2026-11")
    assert status["has_budget"] is True
    assert status["burn_rate_status"] == "exceeded"
    assert status["categories"][0]["exceeded"] is True


def test_conversational_scenarios_and_missing_info_guard():
    sample_txs = [
        {"type": "income", "date": "2026-10-01", "category": "Salary", "amount": 100000},
        {"type": "expense", "date": "2026-10-05", "category": "Housing", "amount": 30000},
        {"type": "expense", "date": "2026-10-10", "category": "Food", "amount": 15000},
        {"type": "expense", "date": "2026-10-12", "category": "Utilities", "amount": 5000},
    ]

    res_drop = run_conversational_scenario(
        "What happens if my income decreases by 20%?",
        transactions=sample_txs,
        profile={},
        goals=[],
    )
    assert res_drop["needs_clarification"] is False
    assert res_drop["simulation"]["modified"]["income"] == 80000.0
    assert res_drop["simulation"]["impact"]["monthly_net_delta"] == -20000.0

    res_loss = run_conversational_scenario(
        "What if I lose my job for 3 months?",
        transactions=sample_txs,
        profile={},
        goals=[{"current_amount": 200000}],
    )
    assert res_loss["needs_clarification"] is False
    assert res_loss["income_loss_months"] == 3
    assert any(f["code"] == "income_interruption" for f in res_loss["simulation"]["risk_flags"])

    res_laptop = run_conversational_scenario(
        "Can I afford a ₹45,000 laptop?",
        transactions=sample_txs,
        profile={},
        goals=[],
    )
    assert res_laptop["needs_clarification"] is False
    assert res_laptop["affordability"] is not None
    assert res_laptop["affordability"]["purchase_amount"] == 45000.0

    res_food = run_conversational_scenario(
        "What if I reduce ₹2,000 on food?",
        transactions=sample_txs,
        profile={},
        goals=[],
    )
    assert res_food["needs_clarification"] is False
    assert res_food["simulation"]["modified"]["expenses"] == 48000.0

    res_missing = run_conversational_scenario(
        "Can I afford a new laptop?",
        transactions=[],
        profile={},
        goals=[],
    )
    assert res_missing["needs_clarification"] is True
    assert len(res_missing["follow_up_questions"]) >= 1


def test_local_rag_retrieval_grounding_and_insufficient_context():
    init_db()
    sources = list_verified_sources()
    assert len(sources) >= 6
    orgs = {s["organization"] for s in sources}
    assert any("SEBI" in o for o in orgs)
    assert any("RBI" in o for o in orgs)
    assert any("AMFI" in o for o in orgs)

    hit = retrieve_knowledge_chunks("Explain SIP, mutual funds, NAV, and expense ratio")
    assert hit["sufficient_context"] is True
    assert len(hit["chunks"]) >= 1
    assert all(ch["url"].startswith("https://") for ch in hit["chunks"])

    miss = retrieve_knowledge_chunks("Recipe for Mars rover titanium alloy welding")
    assert miss["sufficient_context"] is False
    assert miss["chunks"] == []


def test_sqlite_auth_onboarding_crud_and_ai_guards(tmp_path: Path):
    prev_db = os.environ.get("FINORACLE_DB_PATH")
    os.environ["FINORACLE_DB_PATH"] = str(tmp_path / "test_finoracle.db")
    try:
        init_db()
        client = TestClient(app)

        # 1. Unauthenticated access must return 401
        assert client.get("/api/ai/forecast").status_code == 401
        assert client.get("/api/transactions").status_code == 401

        # 2. Register + Login + /api/auth/me + persistent onboarding
        reg = client.post(
            "/api/auth/register",
            json={
                "full_name": "Aarav Mehta",
                "email": "aarav@finoracle.in",
                "password": "StrongPassword1",
            },
        )
        assert reg.status_code == 200
        token = reg.json()["access_token"]
        assert reg.json()["user"]["onboarding_completed"] is False
        headers = {"Authorization": f"Bearer {token}"}

        # Complete onboarding and verify persistence via /api/auth/me
        onb = client.post(
            "/api/auth/onboarding",
            headers=headers,
            json={
                "occupation": "Salaried employee",
                "income_mode": "monthly",
                "income_value": 120000,
                "currency": "INR",
                "primary_goal": "Emergency Fund",
            },
        )
        assert onb.status_code == 200
        assert onb.json()["onboarding_completed"] is True

        me = client.get("/api/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["user"]["onboarding_completed"] is True
        assert me.json()["user"]["monthly_income"] == 120000.0

        # 3. Create transaction & verify dashboard + confirmation guard on category correction
        tx_resp = client.post(
            "/api/transactions",
            headers=headers,
            json={
                "type": "expense",
                "amount": 1250,
                "category": "Other",
                "description": "UPI/SWIGGY DINNER ORDER",
                "date": "2026-11-20",
                "payment_method": "UPI",
            },
        )
        assert tx_resp.status_code == 200
        tx_id = tx_resp.json()["id"]

        # Reject mutation without confirmed=True
        bad_corr = client.post(
            "/api/ai/categories/correct",
            headers=headers,
            json={
                "transaction_id": tx_id,
                "corrected_category": "Food",
                "confirmed": False,
            },
        )
        assert bad_corr.status_code == 400

        # Accept mutation with confirmed=True and verify SQLite feedback persistence
        ok_corr = client.post(
            "/api/ai/categories/correct",
            headers=headers,
            json={
                "transaction_id": tx_id,
                "corrected_category": "Food",
                "predicted_category": "Food",
                "confidence": 0.92,
                "confirmed": True,
            },
        )
        assert ok_corr.status_code == 200
        assert ok_corr.json()["feedback_saved"] is True

        # Evaluation & Dashboard endpoints succeed
        eval_resp = client.get("/api/ai/classify/evaluation", headers=headers)
        assert eval_resp.status_code == 200
        assert eval_resp.json()["ml_model"]["macro_f1"] > eval_resp.json()["baseline_model"]["macro_f1"]

        dash_resp = client.get("/api/dashboard", headers=headers)
        assert dash_resp.status_code == 200
        assert dash_resp.json()["has_data"] is True
    finally:
        if prev_db is None:
            os.environ.pop("FINORACLE_DB_PATH", None)
        else:
            os.environ["FINORACLE_DB_PATH"] = prev_db


def test_deterministic_copilot_synthesis_and_key_redaction():
    from backend.llm.copilot import synthesize_deterministic_answer
    from backend.llm.provider import _sanitize_error_text

    # Secret keys must never leak in error strings
    redacted = _sanitize_error_text(
        "HTTP 429 on url?key=AQ.SecretTestKey123", secret="AQ.SecretTestKey123"
    )
    assert "AQ.SecretTestKey123" not in redacted
    assert "[REDACTED]" in redacted

    # Deterministic fallback produces clean INR-formatted summary
    answer = synthesize_deterministic_answer(
        tool_traces=[
            {
                "tool_name": "get_monthly_income_and_expenses",
                "arguments": {},
                "result": {
                    "active_month": "2026-11",
                    "current_period": {
                        "income": 120000.0,
                        "expenses": 45000.0,
                        "net_cash_flow": 75000.0,
                        "savings_rate": 62.5,
                        "transaction_count": 4,
                    },
                    "previous_month": {"month": "2026-10", "expenses": 40000.0},
                    "mom_expense_change_percent": 12.5,
                    "monthly_history_count": 2,
                },
            },
            {
                "tool_name": "get_category_breakdown",
                "arguments": {},
                "result": {
                    "month": "2026-11",
                    "breakdown": {
                        "total_expenses": 45000.0,
                        "categories": [
                            {"category": "Rent", "amount": 25000.0, "percentage": 55.6},
                            {"category": "Food", "amount": 12000.0, "percentage": 26.7},
                        ],
                    },
                    "previous_month_comparison": [
                        {"category": "Food", "current": 12000.0, "previous": 7000.0, "delta": 5000.0}
                    ],
                },
            },
        ],
        citations=[],
    )
    assert "₹1,20,000" in answer
    assert "₹75,000" in answer
    assert "62.5%" in answer
    assert "Food" in answer
    assert "12.5%" in answer


def test_sample_ledger_load_insights_and_clear(tmp_path: Path):
    prev_db = os.environ.get("FINORACLE_DB_PATH")
    os.environ["FINORACLE_DB_PATH"] = str(tmp_path / "test_sample.db")
    try:
        init_db()
        client = TestClient(app)
        reg = client.post(
            "/api/auth/register",
            json={"full_name": "Sample Tester", "email": "sample@finoracle.in", "password": "StrongPassword1"},
        )
        assert reg.status_code == 200
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        # Empty account: status reports 0, sample can be loaded
        st = client.get("/api/sample-data/status", headers=headers).json()
        assert st["total_count"] == 0 and st["can_load_sample"] is True

        # Load sample ledger (tagged as sample)
        load = client.post("/api/sample-data/load", headers=headers)
        assert load.status_code == 200
        assert load.json()["transactions_created"] > 60
        st = client.get("/api/sample-data/status", headers=headers).json()
        assert st["sample_count"] == st["total_count"] > 0

        txs = client.get("/api/transactions?per_page=200", headers=headers).json()["data"]
        assert all(t["is_sample"] for t in txs)

        # Insights now have 3 full months -> forecast available, anomalies and savings opportunities present
        ins = client.get("/api/ai/insights", headers=headers).json()
        assert ins["forecast"]["available"] is True
        assert len(ins["monthly_series"]) >= 4
        assert ins["unusual_spending"]["available"] is True
        assert any("Headphones" in a["description"] for a in ins["unusual_spending"]["alerts"])
        assert len(ins["savings_opportunities"]) >= 1
        assert ins["top_category"]["category"] == "Housing"

        # RAG status endpoint exposes corpus panel data
        rag = client.get("/api/ai/rag/status", headers=headers)
        assert rag.status_code == 200
        assert rag.json()["chunks_in_db"] > 0
        assert len(rag.json()["organizations"]) >= 5
        assert len(rag.json()["sample_questions"]) >= 3

        # Clear sample data removes only sample rows
        cleared = client.delete("/api/sample-data", headers=headers).json()
        assert cleared["transactions_removed"] > 0
        assert client.get("/api/sample-data/status", headers=headers).json()["total_count"] == 0

        # Real transactions block sample loading (never mix silently)
        client.post(
            "/api/transactions",
            headers=headers,
            json={
                "type": "expense",
                "amount": 500,
                "category": "Food",
                "description": "Real lunch",
                "date": "2026-11-01",
            },
        )
        blocked = client.post("/api/sample-data/load", headers=headers)
        assert blocked.status_code == 409
    finally:
        if prev_db is None:
            os.environ.pop("FINORACLE_DB_PATH", None)
        else:
            os.environ["FINORACLE_DB_PATH"] = prev_db
