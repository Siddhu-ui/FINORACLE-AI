# FinOracle AI — Hybrid ML, Grounded RAG & Financial Intelligence Platform

FinOracle AI is a self-contained, zero-config Indian personal finance intelligence platform combining **Scikit-learn ML**, a **Local SQLite + NumPy RAG Knowledge Engine** grounded in official Indian regulatory sources, a **Tool-Calling Gemini Financial Copilot**, and a **Deterministic Predictive Analytics & What-If Scenario Simulator**.

---

## Repository Structure

```text
finOracleAi/
├── frontend/                  # React 18 + TypeScript + Vite + Tailwind CSS + Recharts v2
│   ├── src/                   # Pages, components, contexts (Auth + Light/HUD Dark Theme), services, styles, types
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vite-env.d.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vercel.json
├── backend/                   # FastAPI + SQLite + Scikit-learn + NumPy RAG + Gemini
│   ├── auth/                  # PBKDF2-SHA256 hashing & HS256 JWT auth
│   ├── db/                    # SQLite connection & automatic schema initialization
│   ├── ml/                    # TF-IDF + LogisticRegression classifier, Ridge forecasting, Isolation Forest anomaly detection
│   ├── rag/                   # Curated RBI/SEBI/AMFI/NCFE/Income Tax/PFRDA corpus & NumPy cosine vector store
│   ├── llm/                   # Native Gemini/OpenAI client (x-goog-api-key + model fallback), 9 typed tools & Copilot
│   ├── insights/              # Evidence-first deterministic + ML insights & savings opportunities
│   ├── scenarios/             # Conversational What-If simulator
│   ├── routes/                # FastAPI routers (auth, CRUD, /api/ai/*, loans, scenarios)
│   ├── services/              # User-scoped SQLite data access, deterministic INR math & sample ledger loader
│   ├── tests/                 # Pytest suite (isolated temporary SQLite DBs)
│   ├── data/                  # Runtime finoracle.db directory (gitignored)
│   ├── main.py                # FastAPI app entrypoint & /health check
│   ├── requirements.txt
│   └── Dockerfile
├── docs/                      # Architecture & API documentation
├── .env.example               # Safe environment template
├── .gitignore
├── pytest.ini
├── render.yaml                # Render Blueprint deployment config
└── README.md
```

---

## Key Capabilities

- **Self-Contained Local Backend:** Auto-initializes SQLite (`backend/data/finoracle.db`) on startup with PBKDF2-SHA256 + HS256 JWT authentication and persistent onboarding—zero external database setup required.
- **Scikit-learn ML Engine:**
  - 12-category Indian UPI/bank narration classifier (`TF-IDF + LogisticRegression`) with live user-correction overrides and benchmark evaluation vs. keyword baseline.
  - Chronological Ridge expense forecasting with 80% uncertainty bands, MAE/RMSE validation, and a strict `< 3` full months guard.
  - Isolation Forest + category IQR unusual spending alerts (statistical deviations only, never claimed as confirmed fraud).
- **Grounded Indian Finance RAG:** Local SQLite + NumPy cosine similarity vector store auto-seeded with official **RBI, SEBI, AMFI, NCFE, Income Tax Department, and PFRDA** sources, clickable verified citation cards, and anti-hallucination thresholds.
- **Tool-Calling Gemini Financial Copilot:** 9 strictly user-scoped Pydantic-validated backend tools + deterministic ₹-formatted synthesis fallback.
- **Dual Theme UI:** Groww / Angel One Light Mode (White `#FFFFFF`/`#F8FAFC` + Emerald `#159B72`) and **HUD Dark Mode** (`#080A0D` + Mint Emerald `#1FBF8B`), toggleable from every page.
- **One-Click 3-Month Sample Indian Ledger:** Clearly tagged demo transactions removable in one click for instant ML & insights testing.

---

## Local Setup & Run Instructions

### 1. Environment Configuration
Copy `.env.example` to `.env` in the repository root and add your `GEMINI_API_KEY`:
```powershell
Copy-Item .env.example .env
```

### 2. Backend Setup & Run (Port `8000`)
Run from the **repository root** (`finOracleAi/`):
```powershell
python -m venv .venv
.\.venv\Scripts\pip.exe install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Verify backend health: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Frontend Setup & Run (Port `5173`)
Run from the **`frontend/`** directory:
```powershell
cd frontend
npm install
npm run dev
```
Open in browser: [http://localhost:5173](http://localhost:5173)

---

## Running Tests & Production Build

### Backend Tests (from repo root)
```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

### Frontend Type-Check, Tests & Build (from `frontend/`)
```powershell
cd frontend
npx tsc --noEmit
npx vitest run
npm run build
```

---

## Documentation
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture & guardrails
- [docs/API.md](docs/API.md) — Complete REST & `/api/ai/*` endpoint reference
