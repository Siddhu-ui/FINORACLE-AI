"""Embedding provider supporting OpenAI and Gemini embeddings (1536d compatible)."""
from __future__ import annotations

from typing import List, Optional

import httpx

from backend.config import get_settings

TARGET_EMBEDDING_DIM = 1536


class EmbeddingNotConfiguredError(RuntimeError):
    """Raised when embedding API credentials are missing."""


def _pad_or_truncate(vector: List[float], dim: int = TARGET_EMBEDDING_DIM) -> List[float]:
    if len(vector) == dim:
        return vector
    if len(vector) > dim:
        return vector[:dim]
    return vector + [0.0] * (dim - len(vector))


def generate_embedding(text: str) -> List[float]:
    """Generate a dense semantic embedding using OpenAI or Gemini."""
    settings = get_settings()
    if not settings.is_embedding_configured:
        raise EmbeddingNotConfiguredError(
            "Embedding provider not configured. Set LLM_PROVIDER (gemini|openai) and GEMINI_API_KEY / OPENAI_API_KEY / LLM_API_KEY."
        )

    cleaned = (text or "").strip()
    if not cleaned:
        raise ValueError("Cannot embed empty text.")

    with httpx.Client(timeout=30.0) as client:
        if settings.embedding_provider == "gemini":
            model = settings.embedding_model or "gemini-embedding-001"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent"
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": settings.embedding_api_key,
            }
            payload = {
                "model": f"models/{model}",
                "content": {"parts": [{"text": cleaned}]},
                "outputDimensionality": TARGET_EMBEDDING_DIM,
            }
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            values = response.json().get("embedding", {}).get("values", [])
            if not values:
                raise RuntimeError("Gemini embedding API returned empty vector.")
            return _pad_or_truncate([float(v) for v in values], TARGET_EMBEDDING_DIM)

        # OpenAI embeddings
        model = settings.embedding_model or "text-embedding-3-small"
        response = client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {settings.embedding_api_key}"},
            json={"model": model, "input": cleaned},
        )
        response.raise_for_status()
        values = response.json()["data"][0]["embedding"]
        return _pad_or_truncate([float(v) for v in values], TARGET_EMBEDDING_DIM)
