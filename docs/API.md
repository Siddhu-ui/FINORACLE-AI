# FinOracle AI — Backend API Reference

Base URL (local dev): `http://localhost:8000` (proxied from Vite at `http://localhost:5173/api`).
All protected endpoints require `Authorization: Bearer <jwt_token>`.

---

## Health & Diagnostics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns SQLite, ML, NumPy RAG, and LLM readiness (`?check_llm=true` pings Gemini live) |
| `GET` | `/api/health` | Same payload exposed under `/api` for Vite proxy |

## Authentication (`/api/auth/*`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create local account (PBKDF2-SHA256) and return HS256 JWT |
| `POST` | `/api/auth/login` | Authenticate user and return HS256 JWT |
| `GET` | `/api/auth/me` | Hydrate current user profile & `onboarding_completed` flag |
| `POST` | `/api/auth/onboarding` | Save income/occupation/goal and persist `onboarding_completed = 1` |
| `PUT` | `/api/auth/password` | Update password for authenticated user |

## Core Financial Data CRUD (`/api/*`)
| Method | Endpoint | Description |
|---|---|---|
| `GET`, `PUT` | `/api/profile` | Read or update user financial profile |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/transactions` | Paginated ledger CRUD (`POST /api/transactions/bulk`, `GET /api/transactions/summary`) |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/budgets` | Monthly category budgets & limits |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/goals` | Savings goals (`POST /api/goals/{id}/contribute`) |
| `GET`, `POST`, `DELETE` | `/api/loans` | User loans |
| `GET`, `POST`, `DELETE` | `/api/scenarios` | Saved What-If scenarios |
| `GET` | `/api/dashboard` | Deterministic period dashboard metrics & charts |
| `GET`, `POST`, `DELETE` | `/api/sample-data` | `/status`, `/load` (3-month tagged Indian sample ledger), `DELETE` (clear sample rows only) |

## Hybrid AI, ML, RAG & Copilot (`/api/ai/*`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/ai/status` | Authenticated AI/ML/LLM configuration status |
| `POST` | `/api/ai/classify` | Classify single narration (TF-IDF + LogisticRegression + user overrides) |
| `POST` | `/api/ai/classify/batch` | Batch classify transactions |
| `GET` | `/api/ai/classify/evaluation` | Held-out ML vs Rule Baseline benchmark (Accuracy, Precision, Recall, Macro-F1, Confusion Matrix) |
| `POST` | `/api/ai/categories/correct` | Save confirmed (`confirmed=true`) category correction to SQLite `category_corrections` |
| `GET` | `/api/ai/forecast` | Chronological Ridge expense forecast with 80% uncertainty band, MAE/RMSE, and `<3` months guard |
| `GET` | `/api/ai/anomalies` | Isolation Forest + category IQR unusual spending alerts |
| `GET` | `/api/ai/insights` | Full evidence-backed insights, monthly series, category MoM, budget burn-rate & savings opportunities |
| `GET` | `/api/ai/rag/status` | Local SQLite + NumPy RAG corpus status, org chunk counts, and sample questions |
| `GET` | `/api/ai/rag/sources` | Verified official Indian regulatory source catalog |
| `POST` | `/api/ai/rag/query` | Grounded RAG query with similarity scores & verified citations |
| `POST` | `/api/ai/copilot/chat` | Tool-calling Gemini Copilot (9 typed user-scoped tools + deterministic fallback) |
| `POST` | `/api/ai/scenarios/converse` | Natural-language What-If financial simulator |
