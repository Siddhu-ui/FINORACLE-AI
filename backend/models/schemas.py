from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class LoanRequest(BaseModel):
    principal: float = Field(..., gt=0, description="Loan principal amount")
    annual_rate: float = Field(..., gt=0, le=100, description="Annual interest rate percentage")
    tenure_months: int = Field(..., gt=0, le=600, description="Loan tenure in months")
    processing_fee_percent: float = Field(default=0.5, ge=0, le=10)
    extra_monthly_prepayment: float = Field(default=0.0, ge=0)

class ScenarioChangeItem(BaseModel):
    id: Optional[str] = None
    type: str = Field(..., description="income_increase, income_decrease, expense_increase, etc.")
    label: str
    amount: float

class ScenarioRequest(BaseModel):
    baseline_income: float = Field(..., ge=0)
    baseline_expenses: float = Field(..., ge=0)
    changes: List[ScenarioChangeItem] = Field(default_factory=list)

class ChatRequest(BaseModel):
    session_id: str
    message: str

class AuthChatRequest(ChatRequest):
    pass

class ClassifyRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    category_hint: str = Field(default="", max_length=100)

class CorrectCategoryRequest(BaseModel):
    transaction_id: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=100)

class ScenarioConversationRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1, max_length=2000)
