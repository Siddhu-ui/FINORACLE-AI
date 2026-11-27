"""Semantic RAG Retriever backed by SQLite + NumPy Cosine Similarity (with TF-IDF fallback).

Strictly enforces similarity thresholds and official Indian source metadata.
Never invents URLs or citations.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from backend.config import get_settings
from backend.rag.chunker import load_corpus_chunks
from backend.rag.embeddings import EmbeddingNotConfiguredError, generate_embedding
from backend.rag.vector_store import CORPUS_DIR, LocalVectorStore


def list_verified_sources() -> List[Dict[str, Any]]:
    docs, chunks = load_corpus_chunks(CORPUS_DIR)
    sections_by_doc: Dict[str, List[str]] = {}
    for ch in chunks:
        sections_by_doc.setdefault(ch.source_title, [])
        if ch.section not in sections_by_doc[ch.source_title]:
            sections_by_doc[ch.source_title].append(ch.section)

    return [
        {
            "source_title": d.source_title,
            "organization": d.organization,
            "url": d.url,
            "publication_or_retrieval_date": d.publication_or_retrieval_date,
            "category": d.category,
            "sections": sections_by_doc.get(d.source_title, []),
        }
        for d in docs
    ]


def retrieve_knowledge_chunks(
    query: str,
    top_k: int = 4,
    similarity_threshold: Optional[float] = None,
    user_access_token: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve grounded chunks from SQLite + NumPy vector store (primary) or TF-IDF cosine fallback."""
    del user_access_token  # No external DB token needed for local SQLite store
    settings = get_settings()
    threshold = (
        similarity_threshold
        if similarity_threshold is not None
        else settings.rag_similarity_threshold
    )
    cleaned_query = (query or "").strip()
    if not cleaned_query:
        return {
            "sufficient_context": False,
            "retrieval_mode": "none",
            "threshold": threshold,
            "chunks": [],
            "message": "Query cannot be empty.",
        }

    store = LocalVectorStore()
    if store.count_chunks() == 0:
        store.ensure_seeded(compute_embeddings=False)

    # 1. Primary: SQLite + NumPy dense cosine similarity when embeddings are populated
    if settings.is_embedding_configured and store.count_embedded_chunks() > 0:
        try:
            q_emb = generate_embedding(cleaned_query)
            # Calibrate dense similarity floor for Gemini embeddings (unrelated text scores ~0.40-0.46)
            dense_threshold = (
                max(threshold, 0.55)
                if settings.embedding_provider == "gemini"
                else threshold
            )
            dense_matches = store.search_numpy_cosine(
                query_embedding=q_emb,
                match_threshold=dense_threshold,
                match_count=top_k,
            )
            if dense_matches:
                return {
                    "sufficient_context": True,
                    "retrieval_mode": "sqlite_numpy_embeddings",
                    "threshold": dense_threshold,
                    "chunks": dense_matches[:top_k],
                }
            # When dense embeddings are populated and nothing cleared dense_threshold,
            # strictly enforce anti-hallucination insufficient_context rather than falling back.
            return {
                "sufficient_context": False,
                "retrieval_mode": "sqlite_numpy_embeddings",
                "threshold": dense_threshold,
                "chunks": [],
                "message": (
                    "Sufficient verified information is not available in the FinOracle AI official "
                    "financial knowledge base for this query."
                ),
            }
        except (EmbeddingNotConfiguredError, Exception):
            pass

    # 2. Fallback: TF-IDF cosine similarity over SQLite-stored authoritative corpus chunks
    rows = store.get_all_chunks()
    if not rows:
        return {
            "sufficient_context": False,
            "retrieval_mode": "sqlite_tfidf",
            "threshold": threshold,
            "chunks": [],
            "message": "Knowledge base is currently empty.",
        }

    tfidf_threshold = min(threshold, 0.12)
    corpus_texts = [
        f"{r['source_title']} {r['organization']} {r['section']} {r['category']} {r['content']}"
        for r in rows
    ]
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        sublinear_tf=True,
    )
    matrix = vectorizer.fit_transform(corpus_texts)
    q_vec = vectorizer.transform([cleaned_query])
    sims = cosine_similarity(q_vec, matrix)[0]
    ranked = np.argsort(sims)[::-1]

    matched_chunks: List[Dict[str, Any]] = []
    for idx in ranked[:top_k]:
        score = float(sims[int(idx)])
        if score < tfidf_threshold:
            continue
        r = rows[int(idx)]
        matched_chunks.append(
            {
                "chunk_id": r["id"],
                "source_title": r["source_title"],
                "title": r["source_title"],
                "organization": r["organization"],
                "url": r["url"],
                "publication_or_retrieval_date": r["publication_date"],
                "section": r["section"],
                "chunk_text": r["content"],
                "similarity": round(score, 4),
                "relevance_score": round(score, 4),
            }
        )

    if not matched_chunks:
        return {
            "sufficient_context": False,
            "retrieval_mode": "sqlite_tfidf",
            "threshold": tfidf_threshold,
            "chunks": [],
            "message": (
                "Sufficient verified information is not available in the FinOracle AI official "
                "financial knowledge base for this query."
            ),
        }

    return {
        "sufficient_context": True,
        "retrieval_mode": "sqlite_tfidf",
        "threshold": tfidf_threshold,
        "chunks": matched_chunks,
    }
