# FinOracle AI — System Architecture

FinOracle AI is a self-contained **Hybrid AI Financial Intelligence Platform** combining deterministic Indian personal-finance mathematics, Scikit-learn machine learning, a local SQLite + NumPy RAG engine grounded in official Indian regulatory sources, and a tool-calling Gemini LLM Copilot.

---

## Repository Structure

```text
finOracleAi/
├── frontend/                  # React 18 + TypeScript + Vite + Tailwind CSS + Recharts v2
│   ├── src/
│   │   ├── components/        # Auth guards, Bento dashboard, Layout (Sidebar/AppLayout), Modals, UI primitives, SampleLedgerBanner
│   │   ├── contexts/          # AuthContext (FastAPI JWT) & ThemeContext (Light / HUD Dark)
│   │   ├── pages/             # Dashboard, Transactions, Budgets, Goals, Loans, Scenarios, AI Copilot & RAG, AI Insights, Reports, Learn, Settings
│   │   ├── services/          # api.ts (Auth + CRUD) & aiApi.ts (/api/ai/*)
│   │   ├── styles/            # globals.css (Light + HUD Dark CSS variables)
│   │   ├── types/             # Shared TypeScript interfaces
│   │   └── utils/             # INR Indian numbering, date helpers
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── vercel.json
├── backend/                   # Python FastAPI + SQLite + Scikit-learn + NumPy RAG + Gemini
│   ├── auth/                  # PBKDF2-SHA256 hashing & HS256 JWT authentication
│   ├── db/                    # SQLite connection manager & auto-schema initialization
│   ├── ml/                    # TF-IDF + LogisticRegression classifier, Ridge forecasting, Isolation Forest anomaly detection
│   ├── rag/                   # Curated RBI/SEBI/AMFI/NCFE/Income Tax/PFRDA corpus, chunker, Gemini embeddings, NumPy cosine store
│   ├── llm/                   # Native Gemini/OpenAI provider (x-goog-api-key + model fallback), 9 typed tools, Copilot orchestrator
│   ├── insights/              # Evidence-first deterministic + ML insights & savings opportunity engine
│   ├── scenarios/             # Conversational What-If scenario parser & deterministic simulator
│   ├── routes/                # FastAPI routers (auth, CRUD, /api/ai/*, loans, scenarios, assistant, intelligence)
│   ├── services/              # SQLite UserDataAccess, finance_math.py, sample_data.py
│   ├── tests/                 # Pytest suite (isolated temp SQLite DBs)
│   ├── data/                  # Runtime finoracle.db location (gitignored)
│   ├── main.py                # FastAPI entrypoint, startup lifespan & /health
│   ├── requirements.txt
│   └── Dockerfile
├── docs/                      # Architecture & API documentation
├── .env.example
├── pytest.ini
├── render.yaml
└── README.md
```

---

## Core Architectural Guardrails

1. **Strict User Isolation:** Every `/api/*` and `/api/ai/*` endpoint verifies the FastAPI HS256 JWT (`Authorization: Bearer <token>`) and scopes all SQLite queries, ML runs, insights, and LLM tool calls strictly to `user_id`.
2. **Deterministic Math Only:** All monetary totals, INR formatting (`en-IN`), savings rates, budget burn-rate pacing, EMI/SIP compounding, affordability checks, and What-If simulations execute in pure unit-tested Python (`backend/services/finance_math.py`).
3. **Typed Tool Calling (No Raw SQL):** The Gemini Copilot can only call 9 Pydantic-validated backend tools (`backend/llm/tools.py`) and never receives database credentials or raw SQL access.
4. **Grounded RAG with Anti-Hallucination Thresholds:** Official Indian regulatory documents (RBI, SEBI, AMFI, NCFE, Income Tax Department, PFRDA) are chunked and stored in SQLite `knowledge_chunks` with `gemini-embedding-001` vectors (TF-IDF fallback if unembedded). Queries below the similarity floor cleanly return `sufficient_context: false`.
5. **Dual Theme System:** Groww / Angel One Light Mode (White `#FFFFFF`/`#F8FAFC` + Emerald `#159B72`) and HUD Dark Mode (`#080A0D` + Mint Emerald `#1FBF8B`), persisted in `localStorage` (`finoracle-theme`).
