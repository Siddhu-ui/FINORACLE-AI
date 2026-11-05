from fastapi import APIRouter, HTTPException
from backend.models.schemas import ScenarioRequest
from backend.services.calculations import simulate_financial_scenario

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.post("/simulate")
async def simulate_scenario(request: ScenarioRequest):
    try:
        changes_dicts = [item.model_dump() for item in request.changes]
        result = simulate_financial_scenario(
            baseline_income=request.baseline_income,
            baseline_expenses=request.baseline_expenses,
            changes=changes_dicts
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal scenario simulation error")
