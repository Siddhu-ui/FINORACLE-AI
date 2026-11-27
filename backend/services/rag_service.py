"""Compatibility facade delegating to backend.rag."""
from __future__ import annotations

from typing import Any, Dict, List

from backend.rag.retriever import retrieve_knowledge_chunks


def search_documents(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    result = retrieve_knowledge_chunks(query=query, top_k=top_k)
    return result.get("chunks", [])
