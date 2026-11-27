"""Document loading, cleaning, and section-aware overlapping chunker for RAG ingestion."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Tuple


@dataclass
class KnowledgeDocument:
    source_title: str
    organization: str
    url: str
    publication_or_retrieval_date: str
    category: str
    content: str
    file_path: str = ""


@dataclass
class KnowledgeChunk:
    chunk_index: int
    section: str
    chunk_text: str
    token_count: int
    source_title: str
    organization: str
    url: str
    publication_or_retrieval_date: str
    category: str
    metadata: Dict[str, Any] = field(default_factory=dict)


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _parse_frontmatter(raw: str) -> Tuple[Dict[str, str], str]:
    meta: Dict[str, str] = {}
    body = raw
    if raw.startswith("---"):
        parts = raw.split("---", 2)
        if len(parts) == 3:
            header, body = parts[1], parts[2]
            for line in header.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    meta[k.strip().lower()] = v.strip()
    return meta, clean_text(body)


def load_document_file(path: Path) -> KnowledgeDocument:
    suffix = path.suffix.lower()
    if suffix in {".md", ".txt"}:
        raw = path.read_text(encoding="utf-8")
        meta, body = _parse_frontmatter(raw)
    elif suffix == ".pdf":
        try:
            from pypdf import PdfReader  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "PDF ingestion requires pypdf (`pip install pypdf`)."
            ) from exc
        reader = PdfReader(str(path))
        pages = [page.extract_text() or "" for page in reader.pages]
        meta = {}
        body = clean_text("\n\n".join(pages))
    else:
        raise ValueError(f"Unsupported document type: {path.suffix}")

    return KnowledgeDocument(
        source_title=meta.get("source_title") or meta.get("title") or path.stem.replace("_", " ").title(),
        organization=meta.get("organization") or "Verified Public Source",
        url=meta.get("url") or meta.get("source_url") or "",
        publication_or_retrieval_date=meta.get("publication_or_retrieval_date")
        or meta.get("publication_date")
        or date.today().isoformat(),
        category=meta.get("category") or "personal_finance",
        content=body,
        file_path=str(path),
    )


def _split_sections(body: str) -> List[Tuple[str, str]]:
    """Split markdown/text by ## section headers."""
    lines = body.splitlines()
    sections: List[Tuple[str, List[str]]] = []
    current_title = "Overview"
    current_lines: List[str] = []

    for line in lines:
        if line.startswith("## "):
            if current_lines:
                sections.append((current_title, current_lines))
            current_title = line[3:].strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        sections.append((current_title, current_lines))

    return [(title, clean_text("\n".join(buf))) for title, buf in sections if clean_text("\n".join(buf))]


def chunk_document(
    doc: KnowledgeDocument,
    chunk_size_words: int = 180,
    overlap_words: int = 35,
) -> List[KnowledgeChunk]:
    """Chunk a KnowledgeDocument into section-preserving overlapping chunks."""
    sections = _split_sections(doc.content)
    chunks: List[KnowledgeChunk] = []
    idx = 0

    for section_title, section_text in sections:
        words = section_text.split()
        if not words:
            continue

        if len(words) <= chunk_size_words:
            chunks.append(
                KnowledgeChunk(
                    chunk_index=idx,
                    section=section_title,
                    chunk_text=section_text,
                    token_count=len(words),
                    source_title=doc.source_title,
                    organization=doc.organization,
                    url=doc.url,
                    publication_or_retrieval_date=doc.publication_or_retrieval_date,
                    category=doc.category,
                    metadata={"file_path": doc.file_path},
                )
            )
            idx += 1
            continue

        start = 0
        step = max(1, chunk_size_words - overlap_words)
        while start < len(words):
            end = min(len(words), start + chunk_size_words)
            chunk_str = " ".join(words[start:end])
            chunks.append(
                KnowledgeChunk(
                    chunk_index=idx,
                    section=section_title,
                    chunk_text=chunk_str,
                    token_count=end - start,
                    source_title=doc.source_title,
                    organization=doc.organization,
                    url=doc.url,
                    publication_or_retrieval_date=doc.publication_or_retrieval_date,
                    category=doc.category,
                    metadata={"file_path": doc.file_path},
                )
            )
            idx += 1
            if end >= len(words):
                break
            start += step

    return chunks


def load_corpus_chunks(
    corpus_dir: Path,
    chunk_size_words: int = 180,
    overlap_words: int = 35,
) -> Tuple[List[KnowledgeDocument], List[KnowledgeChunk]]:
    docs: List[KnowledgeDocument] = []
    all_chunks: List[KnowledgeChunk] = []
    for file_path in sorted(corpus_dir.glob("*")):
        if file_path.suffix.lower() not in {".md", ".txt", ".pdf"}:
            continue
        doc = load_document_file(file_path)
        docs.append(doc)
        all_chunks.extend(
            chunk_document(doc, chunk_size_words=chunk_size_words, overlap_words=overlap_words)
        )
    return docs, all_chunks
