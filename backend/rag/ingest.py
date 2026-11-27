"""Local SQLite + NumPy RAG Document Ingestion CLI.

Usage:
    python -m backend.rag.ingest --corpus-dir backend/rag/corpus
    python -m backend.rag.ingest --dry-run
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, Dict

from backend.db.database import init_db
from backend.rag.chunker import load_corpus_chunks
from backend.rag.vector_store import CORPUS_DIR, LocalVectorStore


def ingest_corpus(
    corpus_dir: Path,
    chunk_size: int = 180,
    overlap: int = 35,
    dry_run: bool = False,
    skip_embeddings: bool = False,
) -> Dict[str, Any]:
    docs, chunks = load_corpus_chunks(
        corpus_dir=corpus_dir,
        chunk_size_words=chunk_size,
        overlap_words=overlap,
    )

    if dry_run:
        return {
            "dry_run": True,
            "documents_parsed": len(docs),
            "chunks_created": len(chunks),
            "organizations": sorted({d.organization for d in docs}),
        }

    init_db()
    store = LocalVectorStore()
    res = store.upsert_chunks(chunks, compute_embeddings=not skip_embeddings)
    return {
        "dry_run": False,
        "documents_ingested": len(docs),
        **res,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest authoritative Indian finance documents into local SQLite vector store.")
    parser.add_argument("--corpus-dir", type=Path, default=CORPUS_DIR)
    parser.add_argument("--chunk-size", type=int, default=180)
    parser.add_argument("--overlap", type=int, default=35)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-embeddings", action="store_true")
    args = parser.parse_args()

    summary = ingest_corpus(
        corpus_dir=args.corpus_dir,
        chunk_size=args.chunk_size,
        overlap=args.overlap,
        dry_run=args.dry_run,
        skip_embeddings=args.skip_embeddings,
    )
    print("RAG Ingestion Summary:", summary)


if __name__ == "__main__":
    main()
