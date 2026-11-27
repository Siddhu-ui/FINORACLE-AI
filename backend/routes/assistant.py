"""Legacy /api/assistant/* endpoints delegating to the unified Hybrid AI Copilot & Scenario Simulator."""
from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, Depends

from backend.auth import require_current_user
from backend.llm.copilot import run_copilot_chat
from backend.models.schemas import ChatRequest, ScenarioConversationRequest
from backend.scenarios.simulator import run_conversational_scenario
from backend.services.data_access import UserDataAccess

router = APIRouter(prefix="/assistant", tags=["Assistant"])


@router.post("/chat")
async def chat_assistant(
    request: ChatRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    return run_copilot_chat(
        session_id=request.session_id,
        message=request.message,
        data_access=da,
        access_token=auth["access_token"],
    )


@router.post("/scenario")
async def conversational_scenario(
    request: ScenarioConversationRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(auth["access_token"], auth["user_id"])
    return run_conversational_scenario(
        message=request.message,
        transactions=da.get_transactions(),
        profile=da.get_profile() or {},
        goals=da.get_goals(),
    )
