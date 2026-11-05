import math
from typing import List, Dict, Any, Optional

def calculate_loan_emi(
    principal: float,
    annual_rate_percent: float,
    tenure_months: int,
    processing_fee_percent: float = 0.5,
    extra_monthly_prepayment: float = 0.0
) -> Dict[str, Any]:
    """
    Computes exact loan EMI using the standard formula:
    EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    along with full amortization schedule and prepayment impact.
    """
    if principal <= 0 or annual_rate_percent <= 0 or tenure_months <= 0:
        raise ValueError("Principal, rate, and tenure must be positive values.")

    r = (annual_rate_percent / 100.0) / 12.0
    factor = math.pow(1.0 + r, tenure_months)
    emi = (principal * r * factor) / (factor - 1.0)
    
    total_repayment = emi * tenure_months
    total_interest = total_repayment - principal
    processing_fee = (principal * processing_fee_percent) / 100.0

    # Build amortization schedule
    balance = principal
    schedule: List[Dict[str, Any]] = []
    yearly_trend: List[Dict[str, Any]] = []
    
    cum_interest = 0.0
    cum_principal = 0.0

    for m in range(1, tenure_months + 1):
        interest_paid = balance * r
        principal_paid = emi - interest_paid
        balance = max(0.0, balance - principal_paid)
        
        cum_interest += interest_paid
        cum_principal += principal_paid

        schedule.append({
            "month": m,
            "emi": round(emi, 2),
            "principal": round(principal_paid, 2),
            "interest": round(interest_paid, 2),
            "balance": round(balance, 2)
        })

        if m % 12 == 0 or m == tenure_months:
            yearly_trend.append({
                "year": math.ceil(m / 12),
                "balance": round(balance, 2),
                "interest_paid": round(cum_interest, 2),
                "principal_paid": round(cum_principal, 2)
            })

    # Prepayment simulation
    prepay_months = 0
    prepay_balance = principal
    prepay_total_interest = 0.0
    prepay_emi = emi + extra_monthly_prepayment

    if extra_monthly_prepayment > 0:
        while prepay_balance > 0 and prepay_months < tenure_months:
            prepay_months += 1
            m_interest = prepay_balance * r
            prepay_total_interest += m_interest
            m_principal = min(prepay_balance, prepay_emi - m_interest)
            prepay_balance = max(0.0, prepay_balance - m_principal)
    else:
        prepay_months = tenure_months
        prepay_total_interest = total_interest

    interest_saved = max(0.0, total_interest - prepay_total_interest)
    months_saved = max(0, tenure_months - prepay_months)

    return {
        "principal": round(principal, 2),
        "annual_rate": annual_rate_percent,
        "tenure_months": tenure_months,
        "emi": round(emi, 2),
        "total_interest": round(total_interest, 2),
        "total_repayment": round(total_repayment, 2),
        "processing_fee": round(processing_fee, 2),
        "effective_cost": round(total_repayment + processing_fee, 2),
        "schedule": schedule,
        "yearly_trend": yearly_trend,
        "prepayment_impact": {
            "extra_monthly": extra_monthly_prepayment,
            "actual_tenure_months": prepay_months,
            "months_saved": months_saved,
            "interest_saved": round(interest_saved, 2),
            "total_interest_paid": round(prepay_total_interest, 2)
        }
    }


def simulate_financial_scenario(
    baseline_income: float,
    baseline_expenses: float,
    changes: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Computes What-If scenario projections, cashflow changes, and 6/12 month trajectories.
    """
    modified_income = baseline_income
    modified_expenses = baseline_expenses
    one_time_capital_outlay = 0.0

    for c in changes:
        c_type = c.get("type")
        amount = float(c.get("amount", 0))

        if c_type == "income_increase":
            modified_income += amount
        elif c_type == "income_decrease":
            modified_income = max(0.0, modified_income - amount)
        elif c_type in ("expense_increase", "new_loan_emi"):
            modified_expenses += amount
        elif c_type == "expense_decrease":
            modified_expenses = max(0.0, modified_expenses - amount)
        elif c_type == "one_time_expense":
            one_time_capital_outlay += amount

    baseline_monthly_savings = baseline_income - baseline_expenses
    modified_monthly_savings = modified_income - modified_expenses
    monthly_net_delta = modified_monthly_savings - baseline_monthly_savings

    projection_12m = []
    cum_baseline = 0.0
    cum_modified = -one_time_capital_outlay

    for m in range(1, 13):
        cum_baseline += baseline_monthly_savings
        cum_modified += modified_monthly_savings
        projection_12m.append({
            "month": f"M{m}",
            "baseline": round(cum_baseline, 2),
            "scenario": round(cum_modified, 2)
        })

    delta_percent = 0.0
    if baseline_monthly_savings != 0:
        delta_percent = (monthly_net_delta / abs(baseline_monthly_savings)) * 100.0

    return {
        "baseline": {
            "income": round(baseline_income, 2),
            "expenses": round(baseline_expenses, 2),
            "monthly_savings": round(baseline_monthly_savings, 2),
            "savings_6m": round(baseline_monthly_savings * 6, 2),
            "savings_12m": round(baseline_monthly_savings * 12, 2)
        },
        "modified": {
            "income": round(modified_income, 2),
            "expenses": round(modified_expenses, 2),
            "one_time_outflow": round(one_time_capital_outlay, 2),
            "monthly_savings": round(modified_monthly_savings, 2),
            "savings_6m": round(modified_monthly_savings * 6 - one_time_capital_outlay, 2),
            "savings_12m": round(modified_monthly_savings * 12 - one_time_capital_outlay, 2)
        },
        "impact": {
            "monthly_net_delta": round(monthly_net_delta, 2),
            "delta_percent": round(delta_percent, 2),
            "annual_net_difference": round((modified_monthly_savings * 12 - one_time_capital_outlay) - (baseline_monthly_savings * 12), 2),
            "goal_impact": "Accelerates Goals" if monthly_net_delta >= 0 else "Delays Goals"
        },
        "projection_12m": projection_12m
    }
