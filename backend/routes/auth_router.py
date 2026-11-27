"""Local FastAPI JWT Authentication & Persistent Onboarding Router."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth.security import (
    create_access_token,
    hash_password,
    require_current_user,
    verify_password,
)
from backend.db.database import get_connection
from backend.services.data_access import UserDataAccess

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=1, max_length=128)


class OnboardingRequest(BaseModel):
    occupation: str = Field(default="", max_length=120)
    income_mode: str = Field(default="monthly", max_length=40)
    income_value: float = Field(default=0.0, ge=0)
    income_type: Optional[str] = Field(default=None, max_length=60)
    currency: str = Field(default="INR", max_length=10)
    primary_goal: str = Field(default="", max_length=250)


class PasswordUpdateRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)


@router.post("/register")
async def register_user(request: RegisterRequest):
    email = request.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())
    pw_hash = hash_password(request.password)

    with get_connection() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")
        conn.execute(
            """
            INSERT INTO users (
                id, email, full_name, password_hash, currency, onboarding_completed, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'INR', 0, ?, ?)
            """,
            (user_id, email, request.full_name.strip(), pw_hash, now, now),
        )

    token = create_access_token(user_id=user_id, email=email)
    profile = UserDataAccess(user_id=user_id).get_profile()
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": profile,
    }


@router.post("/login")
async def login_user(request: LoginRequest):
    email = request.email.strip().lower()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not row or not verify_password(request.password, str(row["password_hash"])):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_id = str(row["id"])
    token = create_access_token(user_id=user_id, email=email)
    profile = UserDataAccess(user_id=user_id).get_profile()
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": profile,
    }


@router.get("/me")
async def get_me(auth: Dict[str, str] = Depends(require_current_user)):
    profile = UserDataAccess(user_id=auth["user_id"]).get_profile()
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found.")
    return {"user": profile}


@router.post("/onboarding")
@router.put("/onboarding")
async def complete_onboarding(
    request: OnboardingRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    da = UserDataAccess(user_id=auth["user_id"])
    inferred_type = request.income_type
    if not inferred_type:
        occ = request.occupation
        inferred_type = (
            "Student"
            if occ == "Student"
            else "Freelance"
            if occ == "Freelancer"
            else "Business"
            if "Business" in occ
            else "Gig Worker"
            if occ == "Gig worker"
            else "Salaried"
        )

    updated = da.update_profile(
        {
            "occupation": request.occupation,
            "income_mode": request.income_mode,
            "income_value": request.income_value,
            "monthly_income": request.income_value,
            "income_type": inferred_type,
            "currency": request.currency or "INR",
            "primary_goal": request.primary_goal,
            "onboarding_completed": True,
        }
    )
    return {"user": updated, "onboarding_completed": True}


@router.put("/password")
async def update_password(
    request: PasswordUpdateRequest,
    auth: Dict[str, str] = Depends(require_current_user),
):
    pw_hash = hash_password(request.new_password)
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (pw_hash, now, auth["user_id"]),
        )
    return {"updated": True}
