"""Deterministic sample Indian household ledger (clearly tagged as sample/demo data).

Used ONLY when a user explicitly clicks "Load Sample Indian Transactions (3 Months)" so that
ML classification, expense forecasting, anomaly detection and insights can be demonstrated.
Rows are flagged `is_sample = 1`, never mixed silently with real user history, and can be
removed in one click. Dates are generated relative to today (3 full prior months + current month).
"""
from __future__ import annotations

import calendar
from datetime import date
from typing import Any, Dict, List, Tuple

# (day, description, merchant, category, amount, payment_method)
_MONTHLY_EXPENSE_TEMPLATE: List[Tuple[int, str, str, str, float, str]] = [
    (2, "NEFT Rent Payment to Landlord", "Landlord", "Housing", 22000.0, "Net Banking"),
    (3, "UPI/BIGBASKET/Weekly Groceries", "BigBasket", "Groceries", 3150.0, "UPI"),
    (4, "Electricity Bill BSES Payment", "BSES", "Utilities", 2050.0, "UPI"),
    (5, "Jio Prepaid Recharge 999", "Jio", "Utilities", 999.0, "UPI"),
    (6, "UPI/SWIGGY/Dinner Order", "Swiggy", "Food", 480.0, "UPI"),
    (7, "Uber Trip Office Commute", "Uber", "Transportation", 340.0, "UPI"),
    (8, "UPI/ZOMATO/Lunch Order", "Zomato", "Food", 390.0, "UPI"),
    (9, "Netflix Subscription Monthly", "Netflix", "Entertainment", 649.0, "Credit Card"),
    (10, "UPI/GROWW/Mutual Fund SIP", "Groww", "Investments", 5000.0, "Net Banking"),
    (11, "UPI/DMART/Monthly Groceries", "DMart", "Groceries", 2900.0, "UPI"),
    (12, "Ola Cab Airport Ride", "Ola", "Transportation", 610.0, "UPI"),
    (13, "UPI/SWIGGY/Weekend Biryani", "Swiggy", "Food", 560.0, "UPI"),
    (14, "Apollo Pharmacy Medicines", "Apollo Pharmacy", "Healthcare", 740.0, "UPI"),
    (15, "Amazon Pay Household Items", "Amazon", "Shopping", 1850.0, "Credit Card"),
    (16, "Indian Oil Petrol Pump Fuel", "Indian Oil", "Transportation", 1500.0, "UPI"),
    (17, "UPI/ZOMATO/Friends Dinner", "Zomato", "Food", 920.0, "UPI"),
    (18, "BookMyShow Movie Tickets", "BookMyShow", "Entertainment", 700.0, "UPI"),
    (19, "UPI/MYNTRA/Clothing", "Myntra", "Shopping", 2100.0, "Credit Card"),
    (20, "Airtel Broadband Bill", "Airtel", "Utilities", 1180.0, "UPI"),
    (21, "UPI/SWIGGY INSTAMART/Groceries", "Swiggy Instamart", "Groceries", 1250.0, "UPI"),
    (22, "UPI/CAFE COFFEE DAY/Coffee", "Cafe Coffee Day", "Food", 360.0, "UPI"),
]

# Small month-to-month variation so the forecaster has a realistic (non-flat) series.
_MONTH_AMOUNT_FACTORS: List[float] = [0.96, 1.00, 1.05]


def _shift_month(year: int, month: int, delta: int) -> Tuple[int, int]:
    idx = year * 12 + (month - 1) + delta
    return idx // 12, idx % 12 + 1


def _safe_day(year: int, month: int, day: int) -> int:
    return min(day, calendar.monthrange(year, month)[1])


def build_sample_ledger(today: date | None = None) -> Dict[str, Any]:
    """Return sample transactions plus a sample budget/goal definition.

    Layout: 3 full calendar months before the current month + current month up to `today`.
    One deliberate unusual-spend item (headphones) sits in the most recent full month so
    Isolation Forest / category-IQR anomaly detection has something genuine to explain.
    """
    today = today or date.today()
    transactions: List[Dict[str, Any]] = []

    month_offsets = [-3, -2, -1, 0]
    for pos, offset in enumerate(month_offsets):
        y, m = _shift_month(today.year, today.month, offset)
        is_current = offset == 0
        factor = _MONTH_AMOUNT_FACTORS[pos] if pos < len(_MONTH_AMOUNT_FACTORS) else 1.0

        # Salary credited on the 1st of every month (current month only if the 1st has passed)
        salary_day = date(y, m, 1)
        if salary_day <= today:
            transactions.append(
                {
                    "type": "income",
                    "amount": 85000.0,
                    "category": "Salary",
                    "description": "Salary Credit NEFT Employer Pvt Ltd",
                    "title": "Salary Credit",
                    "merchant": "Employer Pvt Ltd",
                    "date": salary_day.isoformat(),
                    "payment_method": "Net Banking",
                }
            )

        for day, desc, merchant, category, amount, method in _MONTHLY_EXPENSE_TEMPLATE:
            d = date(y, m, _safe_day(y, m, day))
            if is_current and d > today:
                continue
            scaled = amount if category in ("Housing", "Investments", "Utilities") else amount * factor
            transactions.append(
                {
                    "type": "expense",
                    "amount": round(scaled, 2),
                    "category": category,
                    "description": desc,
                    "title": desc,
                    "merchant": merchant,
                    "date": d.isoformat(),
                    "payment_method": method,
                }
            )

        if offset == -1:
            spike_day = date(y, m, _safe_day(y, m, 24))
            transactions.append(
                {
                    "type": "expense",
                    "amount": 18500.0,
                    "category": "Shopping",
                    "description": "Amazon Electronics Wireless Headphones",
                    "title": "Amazon Electronics Wireless Headphones",
                    "merchant": "Amazon",
                    "date": spike_day.isoformat(),
                    "payment_method": "Credit Card",
                }
            )

    for t in transactions:
        t["notes"] = "Sample data (demo ledger)"
        t["is_sample"] = True

    cur_month = today.strftime("%Y-%m")
    budget = {
        "name": "Sample Budget (Demo)",
        "month": cur_month,
        "planned_income": 85000.0,
        "total_limit": 48000.0,
        "categories": [
            {"category": "Housing", "limit_amount": 22000.0},
            {"category": "Food", "limit_amount": 2000.0},
            {"category": "Groceries", "limit_amount": 6000.0},
            {"category": "Transportation", "limit_amount": 2500.0},
            {"category": "Shopping", "limit_amount": 2500.0},
            {"category": "Entertainment", "limit_amount": 1000.0},
        ],
    }

    gy, gm = _shift_month(today.year, today.month, 10)
    goal = {
        "title": "Sample Goal: Emergency Fund (Demo)",
        "description": "Sample demo goal — 6 months of expenses",
        "target_amount": 250000.0,
        "current_amount": 60000.0,
        "target_date": date(gy, gm, 1).isoformat(),
        "monthly_contribution": 12000.0,
        "color": "#159B72",
    }
    return {"transactions": transactions, "budget": budget, "goal": goal}
