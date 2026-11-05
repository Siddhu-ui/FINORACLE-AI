from typing import List, Dict, Any
import re

DOCUMENT_KNOWLEDGE_BASE = [
    {
        "id": "doc-50-30-20",
        "title": "Mastering Personal Cashflow Frameworks",
        "organization": "Financial Planning Standards Board",
        "category": "budgeting",
        "chunk_text": "The 50/30/20 framework divides after-tax income into needs (50%), wants (30%), and savings/debt acceleration goals (20%). Allocating more than 50% to mandatory needs indicates fixed expense vulnerability, requiring housing or vehicle down-scaling.",
        "keywords": ["50/30/20", "budget", "rule", "needs", "wants", "cashflow", "save"]
    },
    {
        "id": "doc-mortgage-prepay",
        "title": "Mortgage Amortization and Opportunity Cost Analysis",
        "organization": "Journal of Financial Economics",
        "category": "loans",
        "chunk_text": "Accelerating home loan principal repayment produces an asymmetrical, risk-free yield equivalent to the gross debt interest rate. When mortgage interest rates exceed 8.5%, prepaying even 1 extra EMI annually can truncate a 20-year loan tenure by over 4 years.",
        "keywords": ["prepay", "loan", "mortgage", "emi", "interest", "tenure", "principal"]
    },
    {
        "id": "doc-emergency-liquidity",
        "title": "Liquidity Reserves in Household Portfolios",
        "organization": "RBI Investor Education Guidelines",
        "category": "savings",
        "chunk_text": "Household contingency funds must prioritize liquidity and capital protection over speculative yield. A minimum of 3 to 6 months of mandatory living expenditures must be kept in liquid savings accounts and instant sweep-in fixed deposits.",
        "keywords": ["emergency", "fund", "cushion", "liquid", "reserve", "buffer"]
    },
    {
        "id": "doc-debt-elimination",
        "title": "Behavioral Economics of Debt Payoff Methods",
        "organization": "National Bureau of Economic Research",
        "category": "debt",
        "chunk_text": "While the Debt Avalanche method minimizes cumulative interest expense by attacking the highest interest rate liability first, the Debt Snowball method significantly increases completion rates by knocking out smaller balances first to build psychological momentum.",
        "keywords": ["avalanche", "snowball", "debt", "payoff", "interest", "credit card"]
    },
    {
        "id": "doc-sip-compounding",
        "title": "Systematic Equity Indexation and Volatility Decay",
        "organization": "Global Asset Management Review",
        "category": "investing",
        "chunk_text": "Systematic Investment Plans (SIPs) in broad-market index funds capitalize on rupee cost averaging, neutralizing equity market timing risks over 10-15 year horizons while historical returns hover between 11% and 13% annualized.",
        "keywords": ["sip", "investing", "index", "equity", "compounding", "mutual fund"]
    }
]

def search_documents(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """
    Performs relevance scoring against certified financial reference documents.
    """
    tokens = set(re.findall(r"\w+", query.lower()))
    scored_docs = []

    for doc in DOCUMENT_KNOWLEDGE_BASE:
        doc_tokens = set(doc["keywords"]) | set(re.findall(r"\w+", doc["chunk_text"].lower()))
        common = tokens.intersection(doc_tokens)
        score = len(common) / max(1, len(tokens))

        # Direct keyword boost
        keyword_hits = sum(1 for kw in doc["keywords"] if kw in query.lower())
        score += keyword_hits * 0.25
        score = min(0.99, max(0.40, score))

        if keyword_hits > 0 or len(common) > 1:
            scored_docs.append({
                "title": doc["title"],
                "organization": doc["organization"],
                "chunk_text": doc["chunk_text"],
                "relevance_score": round(score, 2)
            })

    scored_docs.sort(key=lambda d: d["relevance_score"], reverse=True)
    return scored_docs[:top_k]
