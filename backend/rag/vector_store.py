"""Local SQLite + NumPy Cosine Similarity Vector Store for RAG (Zero External DB Dependencies)."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from backend.config import get_settings
from backend.db.database import get_connection
from backend.rag.chunker import KnowledgeChunk, load_corpus_chunks
from backend.rag.embeddings import EmbeddingNotConfiguredError, generate_embedding

CORPUS_DIR = Path(__file__).resolve().parent / "corpus"


class LocalVectorStore:
    """Stores authoritative knowledge chunks in SQLite and runs pure NumPy cosine similarity."""

    def count_chunks(self) -> int:
        with get_connection() as conn:
            row = conn.execute("SELECT COUNT(*) AS cnt FROM knowledge_chunks").fetchone()
        return int(row["cnt"]) if row else 0

    def count_embedded_chunks(self) -> int:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS cnt FROM knowledge_chunks WHERE embedding_json IS NOT NULL AND embedding_json != ''"
            ).fetchone()
        return int(row["cnt"]) if row else 0

    def get_all_chunks(self) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            rows = conn.execute("SELECT * FROM knowledge_chunks ORDER BY source_title, id").fetchall()
        return [dict(r) for r in rows]

    def upsert_chunks(self, chunks: List[KnowledgeChunk], compute_embeddings: bool = True) -> Dict[str, Any]:
        settings = get_settings()
        now = datetime.now(timezone.utc).isoformat()
        inserted = 0
        embedded = 0
        embed_failed = False

        with get_connection() as conn:
            conn.execute("DELETE FROM knowledge_chunks")
            for ch in chunks:
                emb_json: Optional[str] = None
                if compute_embeddings and settings.is_embedding_configured and not embed_failed:
                    try:
                        vec = generate_embedding(f"{ch.source_title} — {ch.section}\n{ch.chunk_text}")
                        emb_json = json.dumps(vec)
                        embedded += 1
                    except (EmbeddingNotConfiguredError, Exception):
                        # Stop calling embedding API for remaining chunks if quota/rate-limited
                        embed_failed = True
                        emb_json = None

                conn.execute(
                    """
                    INSERT INTO knowledge_chunks (
                        id, source_title, organization, url, publication_date,
                        section, category, content, embedding_json, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        f"chunk-{ch.category}-{ch.chunk_index}-{uuid.uuid4().hex[:6]}",
                        ch.source_title,
                        ch.organization,
                        ch.url,
                        ch.publication_or_retrieval_date,
                        ch.section,
                        ch.category,
                        ch.chunk_text,
                        emb_json,
                        now,
                    ),
                )
                inserted += 1

        return {
            "chunks_inserted": inserted,
            "chunks_embedded": embedded,
            "embedding_fallback_triggered": embed_failed,
        }

    def ensure_seeded(self, compute_embeddings: bool = True) -> Dict[str, Any]:
        """Auto-seed curated Indian finance corpus on backend startup if SQLite table is empty."""
        existing = self.count_chunks()
        if existing > 0:
            return {
                "already_seeded": True,
                "chunks_in_db": existing,
                "chunks_embedded": self.count_embedded_chunks(),
            }
        _, chunks = load_corpus_chunks(CORPUS_DIR, chunk_size_words=180, overlap_words=35)
        res = self.upsert_chunks(chunks, compute_embeddings=compute_embeddings)
        return {"already_seeded": False, **res}

    def search_numpy_cosine(
        self,
        query_embedding: List[float],
        match_threshold: float = 0.35,
        match_count: int = 5,
    ) -> List[Dict[str, Any]]:
        rows = self.get_all_chunks()
        embedded_rows = []
        vectors = []

        for r in rows:
            raw_emb = r.get("embedding_json")
            if not raw_emb:
                continue
            try:
                vec = json.loads(raw_emb)
                if isinstance(vec, list) and len(vec) == len(query_embedding):
                    embedded_rows.append(r)
                    vectors.append(vec)
            except Exception:
                continue

        if not vectors:
            return []

        mat = np.array(vectors, dtype=np.float32)
        q = np.array(query_embedding, dtype=np.float32)
        q_norm = float(np.linalg.norm(q))
        if q_norm == 0.0:
            return []

        row_norms = np.linalg.norm(mat, axis=1)
        row_norms = np.where(row_norms == 0.0, 1e-12, row_norms)
        sims = np.dot(mat, q) / (row_norms * q_norm)

        ranked = np.argsort(sims)[::-1]
        matches: List[Dict[str, Any]] = []
        for idx in ranked[:match_count]:
            score = float(sims[int(idx)])
            if score < match_threshold:
                continue
            r = embedded_rows[int(idx)]
            matches.append(
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
        return matches
