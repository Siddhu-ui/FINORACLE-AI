"""Ingest verified public financial documents into Supabase pgvector.

Usage:
  python -m backend.scripts.ingest_knowledge

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Add approved source URLs and
text only; this script does not fabricate financial claims or citations.
"""
import os
from typing import Iterable, List

import httpx

from backend.services.rag_service import DOCUMENT_KNOWLEDGE_BASE


def chunks(text: str, size: int = 700, overlap: int = 100) -> List[str]:
    words = text.split()
    result = []
    start = 0
    while start < len(words):
        end = min(len(words), start + size)
        result.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - overlap
    return result


def main() -> None:
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    api_key = os.getenv("LLM_API_KEY")
    if not url or not key:
        raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    if not api_key:
        raise SystemExit("Missing LLM_API_KEY for embeddings")

    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=representation"}
    model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    with httpx.Client(timeout=30.0) as client:
        for doc in DOCUMENT_KNOWLEDGE_BASE:
            if not doc.get("source_url"):
                continue
            response = client.post(f"{url}/rest/v1/knowledge_documents", headers=headers, json={
                "source_name": doc["organization"], "source_url": doc["source_url"], "title": doc["title"],
                "organization": doc["organization"], "category": doc["category"], "is_verified_public_source": True,
            })
            response.raise_for_status()
            document_id = response.json()[0]["id"]
            for index, chunk in enumerate(chunks(doc["chunk_text"])):
                embedding_response = client.post("https://api.openai.com/v1/embeddings", headers={"Authorization": f"Bearer {api_key}"}, json={"model": model, "input": chunk})
                embedding_response.raise_for_status()
                embedding = embedding_response.json()["data"][0]["embedding"]
                client.post(f"{url}/rest/v1/knowledge_chunks", headers=headers, json={
                    "document_id": document_id, "chunk_index": index, "chunk_text": chunk, "embedding": embedding,
                }).raise_for_status()


if __name__ == "__main__":
    main()
