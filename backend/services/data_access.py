"""Strictly user-scoped SQLite data access layer for FinOracle AI."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.db.database import get_connection


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_profile(row: Any) -> Dict[str, Any]:
    d = dict(row)
    try:
        add_sources = json.loads(d.get("additional_income_sources") or "[]")
    except Exception:
        add_sources = []
    return {
        "id": d["id"],
        "user_id": d["id"],
        "full_name": d.get("full_name") or "",
        "email": d.get("email") or "",
        "phone": d.get("phone") or "",
        "date_of_birth": d.get("date_of_birth") or "",
        "occupation": d.get("occupation") or "",
        "income_mode": d.get("income_mode") or "monthly",
        "income_value": float(d.get("income_value") or 0.0),
        "monthly_income": float(d.get("income_value") or 0.0),
        "income_type": d.get("income_type") or "Salaried",
        "additional_income_sources": add_sources,
        "planning_period_start_day": int(d.get("planning_period_start_day") or 1),
        "currency": d.get("currency") or "INR",
        "primary_goal": d.get("primary_goal") or "",
        "onboarding_completed": bool(d.get("onboarding_completed")),
        "created_at": d.get("created_at") or "",
        "updated_at": d.get("updated_at") or "",
    }


def _row_to_transaction(row: Any) -> Dict[str, Any]:
    d = dict(row)
    return {
        "id": d["id"],
        "user_id": d["user_id"],
        "title": d.get("title") or d.get("description") or "",
        "merchant": d.get("merchant") or "",
        "description": d.get("description") or d.get("title") or "",
        "amount": float(d["amount"]),
        "type": d["type"],
        "category": d["category"],
        "predicted_category": d.get("predicted_category"),
        "confidence": float(d["confidence"]) if d.get("confidence") is not None else None,
        "date": d["date"],
        "payment_method": d.get("payment_method") or "UPI",
        "notes": d.get("notes") or "",
        "is_recurring": bool(d.get("is_recurring")),
        "is_sample": bool(d.get("is_sample")),
        "created_at": d["created_at"],
        "updated_at": d["updated_at"],
    }


def _row_to_budget(row: Any) -> Dict[str, Any]:
    d = dict(row)
    try:
        cats = json.loads(d.get("categories_json") or "[]")
    except Exception:
        cats = []
    formatted_cats = [
        {
            "id": str(c.get("id") or f"{d['id']}-{i}"),
            "budget_id": d["id"],
            "category": str(c.get("category") or "Other"),
            "limit_amount": float(c.get("limit_amount") or 0.0),
        }
        for i, c in enumerate(cats)
    ]
    return {
        "id": d["id"],
        "user_id": d["user_id"],
        "name": d["name"],
        "category": d.get("category") or "Overall",
        "limit_amount": float(d.get("limit_amount") or d.get("total_limit") or 0.0),
        "total_limit": float(d.get("total_limit") or d.get("limit_amount") or 0.0),
        "planned_income": float(d.get("planned_income") or 0.0),
        "month": d["month"],
        "categories": formatted_cats,
        "budget_categories": formatted_cats,
        "created_at": d["created_at"],
        "updated_at": d["updated_at"],
    }


def _row_to_goal(row: Any) -> Dict[str, Any]:
    d = dict(row)
    return {
        "id": d["id"],
        "user_id": d["user_id"],
        "title": d["title"],
        "description": d.get("description") or "",
        "target_amount": float(d["target_amount"]),
        "current_amount": float(d["current_amount"]),
        "target_date": d["target_date"],
        "monthly_contribution": float(d.get("monthly_contribution") or 0.0),
        "status": d.get("status") or "active",
        "icon": d.get("icon") or "",
        "color": d.get("color") or "#159B72",
        "created_at": d["created_at"],
        "updated_at": d["updated_at"],
    }


def _row_to_scenario(row: Any) -> Dict[str, Any]:
    d = dict(row)
    return {
        "id": d["id"],
        "user_id": d["user_id"],
        "name": d["name"],
        "description": d.get("description") or "",
        "baseline": json.loads(d.get("baseline_json") or "{}"),
        "modified": json.loads(d.get("modified_json") or "{}"),
        "impact": json.loads(d.get("impact_json") or "{}"),
        "created_at": d["created_at"],
        "updated_at": d["updated_at"],
    }


class UserDataAccess:
    """Strictly user_id-scoped SQLite repository for all FinOracle AI services and tools."""

    def __init__(self, access_token: str = "", user_id: str = ""):
        # Support both UserDataAccess(access_token, user_id) and UserDataAccess(user_id=...)
        self.access_token = access_token
        self.user_id = user_id or access_token

    # ---- Profile / User ----
    def get_profile(self) -> Optional[Dict[str, Any]]:
        with get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (self.user_id,)).fetchone()
        return _row_to_profile(row) if row else None

    def update_profile(self, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        current = self.get_profile()
        if not current:
            return None

        income_val = updates.get("monthly_income")
        if income_val is None:
            income_val = updates.get("income_value")
        if income_val is None:
            income_val = current["monthly_income"]

        add_sources = updates.get("additional_income_sources")
        if add_sources is None:
            add_sources = current["additional_income_sources"]

        onboarding_val = updates.get("onboarding_completed")
        if onboarding_val is None:
            onboarding_val = current["onboarding_completed"]

        now = _utc_now()
        with get_connection() as conn:
            conn.execute(
                """
                UPDATE users
                SET full_name = ?,
                    phone = ?,
                    date_of_birth = ?,
                    occupation = ?,
                    income_mode = ?,
                    income_value = ?,
                    income_type = ?,
                    additional_income_sources = ?,
                    planning_period_start_day = ?,
                    currency = ?,
                    primary_goal = ?,
                    onboarding_completed = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    str(updates.get("full_name") or current["full_name"]),
                    str(updates.get("phone") if updates.get("phone") is not None else current["phone"]),
                    str(updates.get("date_of_birth") if updates.get("date_of_birth") is not None else current["date_of_birth"]),
                    str(updates.get("occupation") if updates.get("occupation") is not None else current["occupation"]),
                    str(updates.get("income_mode") or current["income_mode"]),
                    float(income_val or 0.0),
                    str(updates.get("income_type") or current["income_type"]),
                    json.dumps(add_sources),
                    int(updates.get("planning_period_start_day") or current["planning_period_start_day"]),
                    str(updates.get("currency") or current["currency"]),
                    str(updates.get("primary_goal") if updates.get("primary_goal") is not None else current["primary_goal"]),
                    1 if onboarding_val else 0,
                    now,
                    self.user_id,
                ),
            )
        return self.get_profile()

    # ---- Transactions ----
    def get_transactions(self, limit: int = 2000) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM transactions WHERE user_id = ? ORDER BY date ASC, created_at ASC LIMIT ?",
                (self.user_id, min(limit, 5000)),
            ).fetchall()
        return [_row_to_transaction(r) for r in rows]

    def get_transaction_by_id(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM transactions WHERE id = ? AND user_id = ?",
                (transaction_id, self.user_id),
            ).fetchone()
        return _row_to_transaction(row) if row else None

    def create_transaction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        tx_id = str(uuid.uuid4())
        now = _utc_now()
        desc = str(data.get("description") or data.get("title") or "").strip()
        title = str(data.get("title") or desc).strip()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO transactions (
                    id, user_id, title, merchant, description, amount, type, category,
                    predicted_category, confidence, date, payment_method, notes, is_recurring,
                    is_sample, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    tx_id,
                    self.user_id,
                    title,
                    str(data.get("merchant") or ""),
                    desc,
                    float(data["amount"]),
                    str(data["type"]),
                    str(data["category"]),
                    data.get("predicted_category"),
                    float(data["confidence"]) if data.get("confidence") is not None else None,
                    str(data["date"]),
                    str(data.get("payment_method") or "UPI"),
                    str(data.get("notes") or ""),
                    1 if data.get("is_recurring") else 0,
                    1 if data.get("is_sample") else 0,
                    now,
                    now,
                ),
            )
        return self.get_transaction_by_id(tx_id)  # type: ignore[return-value]

    # ---- Sample Indian Ledger (clearly tagged demo data) ----
    SAMPLE_BUDGET_NAME = "Sample Budget (Demo)"
    SAMPLE_GOAL_PREFIX = "Sample Goal:"

    def count_transactions(self) -> int:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS cnt FROM transactions WHERE user_id = ?", (self.user_id,)
            ).fetchone()
        return int(row["cnt"]) if row else 0

    def count_sample_transactions(self) -> int:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS cnt FROM transactions WHERE user_id = ? AND is_sample = 1",
                (self.user_id,),
            ).fetchone()
        return int(row["cnt"]) if row else 0

    def delete_sample_data(self) -> Dict[str, int]:
        """Remove only rows tagged as sample data (transactions, sample budget, sample goal, their ML corrections)."""
        with get_connection() as conn:
            sample_ids = [
                str(r["id"])
                for r in conn.execute(
                    "SELECT id FROM transactions WHERE user_id = ? AND is_sample = 1", (self.user_id,)
                ).fetchall()
            ]
            for tid in sample_ids:
                conn.execute(
                    "DELETE FROM category_corrections WHERE user_id = ? AND transaction_id = ?",
                    (self.user_id, tid),
                )
            tx_cur = conn.execute(
                "DELETE FROM transactions WHERE user_id = ? AND is_sample = 1", (self.user_id,)
            )
            b_cur = conn.execute(
                "DELETE FROM budgets WHERE user_id = ? AND name = ?",
                (self.user_id, self.SAMPLE_BUDGET_NAME),
            )
            g_cur = conn.execute(
                "DELETE FROM goals WHERE user_id = ? AND title LIKE ?",
                (self.user_id, f"{self.SAMPLE_GOAL_PREFIX}%"),
            )
        return {
            "transactions_removed": tx_cur.rowcount,
            "budgets_removed": b_cur.rowcount,
            "goals_removed": g_cur.rowcount,
        }

    def update_transaction(self, transaction_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = self.get_transaction_by_id(transaction_id)
        if not existing:
            return None
        now = _utc_now()
        desc = str(data.get("description") or data.get("title") or existing["description"]).strip()
        title = str(data.get("title") or desc).strip()
        with get_connection() as conn:
            conn.execute(
                """
                UPDATE transactions
                SET title = ?, merchant = ?, description = ?, amount = ?, type = ?,
                    category = ?, date = ?, payment_method = ?, notes = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (
                    title,
                    str(data.get("merchant") if data.get("merchant") is not None else existing["merchant"]),
                    desc,
                    float(data.get("amount") if data.get("amount") is not None else existing["amount"]),
                    str(data.get("type") or existing["type"]),
                    str(data.get("category") or existing["category"]),
                    str(data.get("date") or existing["date"]),
                    str(data.get("payment_method") if data.get("payment_method") is not None else existing["payment_method"]),
                    str(data.get("notes") if data.get("notes") is not None else existing["notes"]),
                    now,
                    transaction_id,
                    self.user_id,
                ),
            )
        return self.get_transaction_by_id(transaction_id)

    def delete_transaction(self, transaction_id: str) -> bool:
        with get_connection() as conn:
            cur = conn.execute(
                "DELETE FROM transactions WHERE id = ? AND user_id = ?",
                (transaction_id, self.user_id),
            )
        return cur.rowcount > 0

    # ---- Category Corrections (ML Feedback Loop) ----
    def get_category_corrections(self, limit: int = 500) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM category_corrections WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                (self.user_id, min(limit, 1000)),
            ).fetchall()
        return [
            {
                "id": r["id"],
                "transaction_id": r["transaction_id"],
                "description": r["merchant_or_text"],
                "merchant_or_text": r["merchant_or_text"],
                "original_category": r["original_category"],
                "predicted_category": r["predicted_category"],
                "corrected_category": r["corrected_category"],
                "confidence": r["confidence"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]

    def save_category_correction(
        self,
        transaction_id: str,
        corrected_category: str,
        predicted_category: Optional[str] = None,
        confidence: Optional[float] = None,
    ) -> Dict[str, Any]:
        existing = self.get_transaction_by_id(transaction_id)
        if not existing:
            return {"updated": False, "feedback_saved": False, "error": "Transaction not found for user"}

        original_category = existing["category"]
        description = existing["description"]
        now = _utc_now()

        with get_connection() as conn:
            conn.execute(
                "UPDATE transactions SET category = ?, updated_at = ? WHERE id = ? AND user_id = ?",
                (corrected_category, now, transaction_id, self.user_id),
            )
            conn.execute(
                """
                INSERT INTO category_corrections (
                    id, user_id, transaction_id, merchant_or_text, original_category,
                    predicted_category, corrected_category, confidence, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    self.user_id,
                    transaction_id,
                    description,
                    original_category,
                    predicted_category or original_category,
                    corrected_category,
                    float(confidence) if confidence is not None else None,
                    now,
                ),
            )

        return {
            "updated": True,
            "feedback_saved": True,
            "transaction_id": transaction_id,
            "original_category": original_category,
            "corrected_category": corrected_category,
        }

    def update_transaction_category(self, transaction_id: str, category: str) -> bool:
        return bool(self.save_category_correction(transaction_id, category).get("updated"))

    # ---- Budgets ----
    def get_budgets(self) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM budgets WHERE user_id = ? ORDER BY month DESC",
                (self.user_id,),
            ).fetchall()
        return [_row_to_budget(r) for r in rows]

    def create_or_upsert_budget(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now = _utc_now()
        month = str(data["month"])
        cats = data.get("categories") or []
        total_limit = float(data.get("total_limit") or data.get("limit_amount") or 0.0)
        planned_income = float(data.get("planned_income") or 0.0)
        name = str(data.get("name") or f"Budget - {month}")
        category = str(data.get("category") or "Overall")

        with get_connection() as conn:
            existing = conn.execute(
                "SELECT id FROM budgets WHERE user_id = ? AND month = ?",
                (self.user_id, month),
            ).fetchone()
            if existing:
                b_id = str(existing["id"])
                conn.execute(
                    """
                    UPDATE budgets
                    SET name = ?, category = ?, limit_amount = ?, total_limit = ?,
                        planned_income = ?, categories_json = ?, updated_at = ?
                    WHERE id = ? AND user_id = ?
                    """,
                    (name, category, total_limit, total_limit, planned_income, json.dumps(cats), now, b_id, self.user_id),
                )
            else:
                b_id = str(uuid.uuid4())
                conn.execute(
                    """
                    INSERT INTO budgets (
                        id, user_id, name, category, limit_amount, total_limit,
                        planned_income, month, categories_json, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (b_id, self.user_id, name, category, total_limit, total_limit, planned_income, month, json.dumps(cats), now, now),
                )
            row = conn.execute("SELECT * FROM budgets WHERE id = ?", (b_id,)).fetchone()
        return _row_to_budget(row)

    def update_budget(self, budget_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with get_connection() as conn:
            existing = conn.execute(
                "SELECT * FROM budgets WHERE id = ? AND user_id = ?",
                (budget_id, self.user_id),
            ).fetchone()
            if not existing:
                return None
            cur = _row_to_budget(existing)
            cats = data.get("categories") if data.get("categories") is not None else cur["categories"]
            total_limit = float(
                data.get("total_limit")
                if data.get("total_limit") is not None
                else cur["total_limit"]
            )
            planned_income = float(
                data.get("planned_income")
                if data.get("planned_income") is not None
                else cur["planned_income"]
            )
            conn.execute(
                """
                UPDATE budgets
                SET name = ?, month = ?, limit_amount = ?, total_limit = ?,
                    planned_income = ?, categories_json = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (
                    str(data.get("name") or cur["name"]),
                    str(data.get("month") or cur["month"]),
                    total_limit,
                    total_limit,
                    planned_income,
                    json.dumps(cats),
                    _utc_now(),
                    budget_id,
                    self.user_id,
                ),
            )
            row = conn.execute("SELECT * FROM budgets WHERE id = ?", (budget_id,)).fetchone()
        return _row_to_budget(row)

    def delete_budget(self, budget_id: str) -> bool:
        with get_connection() as conn:
            cur = conn.execute(
                "DELETE FROM budgets WHERE id = ? AND user_id = ?",
                (budget_id, self.user_id),
            )
        return cur.rowcount > 0

    # ---- Goals ----
    def get_goals(self) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC",
                (self.user_id,),
            ).fetchall()
        return [_row_to_goal(r) for r in rows]

    def create_goal(self, data: Dict[str, Any]) -> Dict[str, Any]:
        g_id = str(uuid.uuid4())
        now = _utc_now()
        target = float(data["target_amount"])
        current = float(data.get("current_amount") or 0.0)
        status = "completed" if current >= target else "active"
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO goals (
                    id, user_id, title, description, target_amount, current_amount,
                    target_date, monthly_contribution, status, icon, color, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    g_id,
                    self.user_id,
                    str(data["title"]),
                    str(data.get("description") or ""),
                    target,
                    current,
                    str(data["target_date"]),
                    float(data.get("monthly_contribution") or 0.0),
                    status,
                    str(data.get("icon") or ""),
                    str(data.get("color") or "#159B72"),
                    now,
                    now,
                ),
            )
            row = conn.execute("SELECT * FROM goals WHERE id = ?", (g_id,)).fetchone()
        return _row_to_goal(row)

    def update_goal(self, goal_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with get_connection() as conn:
            existing = conn.execute(
                "SELECT * FROM goals WHERE id = ? AND user_id = ?",
                (goal_id, self.user_id),
            ).fetchone()
            if not existing:
                return None
            cur = _row_to_goal(existing)
            target = float(data.get("target_amount") if data.get("target_amount") is not None else cur["target_amount"])
            current = float(data.get("current_amount") if data.get("current_amount") is not None else cur["current_amount"])
            status = str(data.get("status") or ("completed" if current >= target else cur["status"]))
            conn.execute(
                """
                UPDATE goals
                SET title = ?, description = ?, target_amount = ?, current_amount = ?,
                    target_date = ?, monthly_contribution = ?, status = ?, color = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (
                    str(data.get("title") or cur["title"]),
                    str(data.get("description") if data.get("description") is not None else cur["description"]),
                    target,
                    current,
                    str(data.get("target_date") or cur["target_date"]),
                    float(data.get("monthly_contribution") if data.get("monthly_contribution") is not None else cur["monthly_contribution"]),
                    status,
                    str(data.get("color") or cur["color"]),
                    _utc_now(),
                    goal_id,
                    self.user_id,
                ),
            )
            row = conn.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone()
        return _row_to_goal(row)

    def contribute_goal(self, goal_id: str, amount: float) -> Optional[Dict[str, Any]]:
        with get_connection() as conn:
            existing = conn.execute(
                "SELECT * FROM goals WHERE id = ? AND user_id = ?",
                (goal_id, self.user_id),
            ).fetchone()
            if not existing:
                return None
            cur = _row_to_goal(existing)
        new_amt = cur["current_amount"] + float(amount)
        new_status = "completed" if new_amt >= cur["target_amount"] else "active"
        return self.update_goal(goal_id, {"current_amount": new_amt, "status": new_status})

    def delete_goal(self, goal_id: str) -> bool:
        with get_connection() as conn:
            cur = conn.execute(
                "DELETE FROM goals WHERE id = ? AND user_id = ?",
                (goal_id, self.user_id),
            )
        return cur.rowcount > 0

    # ---- Loans ----
    def get_loans(self) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC",
                (self.user_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def create_loan(self, data: Dict[str, Any]) -> Dict[str, Any]:
        l_id = str(uuid.uuid4())
        now = _utc_now()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO loans (id, user_id, name, principal, interest_rate, tenure_months, emi, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    l_id,
                    self.user_id,
                    str(data["name"]),
                    float(data["principal"]),
                    float(data["interest_rate"]),
                    int(data["tenure_months"]),
                    float(data["emi"]),
                    now,
                ),
            )
            row = conn.execute("SELECT * FROM loans WHERE id = ?", (l_id,)).fetchone()
        return dict(row)

    def delete_loan(self, loan_id: str) -> bool:
        with get_connection() as conn:
            cur = conn.execute(
                "DELETE FROM loans WHERE id = ? AND user_id = ?",
                (loan_id, self.user_id),
            )
        return cur.rowcount > 0

    # ---- Scenarios ----
    def get_scenarios(self) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM scenarios WHERE user_id = ? ORDER BY created_at DESC",
                (self.user_id,),
            ).fetchall()
        return [_row_to_scenario(r) for r in rows]

    def create_scenario(self, data: Dict[str, Any]) -> Dict[str, Any]:
        s_id = str(uuid.uuid4())
        now = _utc_now()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO scenarios (
                    id, user_id, name, description, baseline_json, modified_json, impact_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    s_id,
                    self.user_id,
                    str(data["name"]),
                    str(data.get("description") or ""),
                    json.dumps(data.get("baseline") or {}),
                    json.dumps(data.get("modified") or {}),
                    json.dumps(data.get("impact") or {}),
                    now,
                    now,
                ),
            )
            row = conn.execute("SELECT * FROM scenarios WHERE id = ?", (s_id,)).fetchone()
        return _row_to_scenario(row)

    def delete_scenario(self, scenario_id: str) -> bool:
        with get_connection() as conn:
            cur = conn.execute(
                "DELETE FROM scenarios WHERE id = ? AND user_id = ?",
                (scenario_id, self.user_id),
            )
        return cur.rowcount > 0
