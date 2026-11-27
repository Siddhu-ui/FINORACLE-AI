"""FinOracle AI Local FastAPI JWT Auth Package."""
from backend.auth.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    require_current_user,
    verify_password,
)

# Compatibility alias for any legacy imports
require_supabase_user = require_current_user

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
    "require_current_user",
    "require_supabase_user",
]
