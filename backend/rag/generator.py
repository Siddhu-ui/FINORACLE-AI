"""Grounded RAG Generator with Strict Citation Enforcement.

Only answers from retrieved chunks above similarity threshold.
Never invents URLs or citations. Never fakes LLM responses if API keys are absent.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from backend.config import get_settings
from backend.llm.provider import LLMNotConfiguredError, LLMProviderError, get_llm_provider
from backend.rag.retriever import retrieve_knowledge_chunks

RAG_SYSTEM_PROMPT = (
    "You are FinOracle AI's Indian Personal Finance Knowledge Assistant. "
    "Answer the user's question STRICTLY using the verified retrieved source excerpts provided below. "
    "Rules:\n"
    "1. Cite sources inline using [1], [2], etc. matching the numbered chunks.\n"
    "2. Do NOT introduce facts, tax rates, rules, or URLs not present in the retrieved excerpts.\n"
    "3. If the excerpts do not contain enough information to answer, explicitly state that sufficient "
    "verified information is not available in the knowledge base.\n"
    "4. Use INR (₹) and Indian financial terminology (SEBI, RBI, AMFI, SIP, NAV, ELSS, Section 80C) accurately.\n"
    "5. End with a one-line educational disclaimer (not personalized legal/tax/investment advice)."
)


def answer_with_rag(
    query: str,
    top_k: int = 4,
    similarity_threshold: Optional[float] = None,
    user_access_token: Optional[str] = None,
) -> Dict[str, Any]:
    retrieval = retrieve_knowledge_chunks(
        query=query,
        top_k=top_k,
        similarity_threshold=similarity_threshold,
        user_access_token=user_access_token,
    )
    chunks: List[Dict[str, Any]] = retrieval.get("chunks", [])
    sufficient = bool(retrieval.get("sufficient_context")) and len(chunks) > 0

    citations = [
        {
            "index": idx + 1,
            "chunk_id": ch["chunk_id"],
            "source_title": ch["source_title"],
            "title": ch["source_title"],
            "organization": ch["organization"],
            "url": ch["url"],
            "publication_or_retrieval_date": ch["publication_or_retrieval_date"],
            "section": ch["section"],
            "chunk_text": ch["chunk_text"],
            "similarity": ch["similarity"],
            "relevance_score": ch["similarity"],
        }
        for idx, ch in enumerate(chunks)
    ]

    if not sufficient:
        return {
            "query": query,
            "sufficient_context": False,
            "llm_configured": get_settings().is_llm_configured,
            "retrieval_mode": retrieval.get("retrieval_mode"),
            "similarity_threshold": retrieval.get("threshold"),
            "answer": (
                "Sufficient verified information is not available in the FinOracle AI official "
                "financial knowledge base to answer this question accurately. Please try asking about "
                "RBI, SEBI, AMFI, NCFE, PFRDA, or Income Tax Department topics (e.g., SIP, Mutual Funds, "
                "NAV, Expense Ratio, ELSS, Emergency Funds, UPI safety, Inflation, or Capital Gains Tax)."
            ),
            "citations": [],
            "disclaimer": "FinOracle AI only answers knowledge queries grounded in verified official Indian public sources.",
        }

    formatted_context = "\n\n".join(
        f"[{c['index']}] {c['source_title']} — {c['organization']} (Section: {c['section']}, Date: {c['publication_or_retrieval_date']}, URL: {c['url']})\n"
        f"{c['chunk_text']}"
        for c in citations
    )

    try:
        provider = get_llm_provider()
        user_prompt = f"VERIFIED SOURCE EXCERPTS:\n{formatted_context}\n\nUSER QUESTION:\n{query}"
        answer = provider.generate_text(
            system_prompt=RAG_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.15,
        )
        return {
            "query": query,
            "sufficient_context": True,
            "llm_configured": True,
            "provider": provider.provider_name,
            "model": provider.model,
            "retrieval_mode": retrieval.get("retrieval_mode"),
            "similarity_threshold": retrieval.get("threshold"),
            "answer": answer,
            "citations": citations,
            "disclaimer": "Educational information sourced from verified public Indian regulatory/financial institutions; not personalized investment or tax advice.",
        }
    except LLMNotConfiguredError as exc:
        # Honest configuration-required response + exact verified retrieved excerpts (never fake an LLM answer!)
        return {
            "query": query,
            "sufficient_context": True,
            "llm_configured": False,
            "configuration_error": str(exc),
            "required_env_vars": exc.required_env_vars,
            "retrieval_mode": retrieval.get("retrieval_mode"),
            "similarity_threshold": retrieval.get("threshold"),
            "answer": None,
            "retrieved_excerpts_summary": (
                f"Retrieved {len(citations)} verified excerpt(s) above similarity threshold from "
                f"{', '.join(sorted({c['organization'] for c in citations}))}. "
                "Configure LLM_PROVIDER and API key on the backend to enable grounded natural-language synthesis."
            ),
            "citations": citations,
            "disclaimer": "LLM synthesis is disabled until backend API credentials are configured. Only verified source excerpts are shown.",
        }
    except LLMProviderError as exc:
        grounded_fallback = "\n\n".join(
            f"**[{c['index']}] {c['source_title']} ({c['organization']})**\n{c['chunk_text']}"
            for c in citations[:3]
        )
        return {
            "query": query,
            "sufficient_context": True,
            "llm_configured": True,
            "fallback_used": True,
            "fallback_reason": exc.short_reason,
            "provider_error": str(exc),
            "retrieval_mode": retrieval.get("retrieval_mode"),
            "similarity_threshold": retrieval.get("threshold"),
            "answer": grounded_fallback,
            "citations": citations,
            "disclaimer": f"Upstream LLM unavailable ({exc.short_reason}); showing verified official source excerpts directly.",
        }
