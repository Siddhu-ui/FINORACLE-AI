from fastapi import APIRouter, HTTPException
from backend.models.schemas import LoanRequest
from backend.services.calculations import calculate_loan_emi

router = APIRouter(prefix="/loans", tags=["Loans"])

@router.post("/calculate")
async def calculate_loan(request: LoanRequest):
    try:
        result = calculate_loan_emi(
            principal=request.principal,
            annual_rate_percent=request.annual_rate,
            tenure_months=request.tenure_months,
            processing_fee_percent=request.processing_fee_percent,
            extra_monthly_prepayment=request.extra_monthly_prepayment
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal loan calculation error")
