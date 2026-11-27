"""Self-contained SQLite database engine with automatic schema initialization."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, List

from backend.config import get_settings

SCHEMA_STATEMENTS: List[str] = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT DEFAULT '',
        date_of_birth TEXT DEFAULT '',
        occupation TEXT DEFAULT '',
        income_mode TEXT DEFAULT 'monthly',
        income_value REAL DEFAULT 0,
        income_type TEXT DEFAULT 'Salaried',
        additional_income_sources TEXT DEFAULT '[]',
        planning_period_start_day INTEGER DEFAULT 1,
        currency TEXT DEFAULT 'INR',
        primary_goal TEXT DEFAULT '',
        onboarding_completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        merchant TEXT DEFAULT '',
        description TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        category TEXT NOT NULL,
        predicted_category TEXT,
        confidence REAL,
        date TEXT NOT NULL,
        payment_method TEXT DEFAULT 'UPI',
        notes TEXT DEFAULT '',
        is_recurring INTEGER DEFAULT 0,
        is_sample INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date)",
    "CREATE INDEX IF NOT EXISTS idx_tx_user_cat ON transactions(user_id, category)",
    """
    CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'Overall',
        limit_amount REAL NOT NULL DEFAULT 0,
        total_limit REAL NOT NULL DEFAULT 0,
        planned_income REAL DEFAULT 0,
        month TEXT NOT NULL,
        categories_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, month)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        target_amount REAL NOT NULL CHECK (target_amount > 0),
        current_amount REAL NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
        target_date TEXT NOT NULL,
        monthly_contribution REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        icon TEXT DEFAULT '',
        color TEXT DEFAULT '#159B72',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS loans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        principal REAL NOT NULL CHECK (principal > 0),
        interest_rate REAL NOT NULL CHECK (interest_rate > 0),
        tenure_months INTEGER NOT NULL CHECK (tenure_months > 0),
        emi REAL NOT NULL CHECK (emi > 0),
        created_at TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        baseline_json TEXT NOT NULL,
        modified_json TEXT NOT NULL,
        impact_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS category_corrections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id TEXT,
        merchant_or_text TEXT NOT NULL,
        original_category TEXT NOT NULL,
        predicted_category TEXT,
        corrected_category TEXT NOT NULL,
        confidence REAL,
        created_at TEXT NOT NULL
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_corr_user ON category_corrections(user_id, created_at)",
    """
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id TEXT PRIMARY KEY,
        source_title TEXT NOT NULL,
        organization TEXT NOT NULL,
        url TEXT NOT NULL,
        publication_date TEXT NOT NULL,
        section TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'personal_finance',
        content TEXT NOT NULL,
        embedding_json TEXT,
        created_at TEXT NOT NULL
    )
    """,
]


def get_db_path() -> Path:
    path = get_settings().db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    db_path = get_db_path()
    conn = sqlite3.connect(str(db_path), timeout=15.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> Path:
    """Create SQLite database file and all tables idempotently on startup."""
    db_path = get_db_path()
    with get_connection() as conn:
        for stmt in SCHEMA_STATEMENTS:
            conn.execute(stmt)
        # Additive, idempotent migration for databases created before sample-data support
        cols = {str(r["name"]) for r in conn.execute("PRAGMA table_info(transactions)").fetchall()}
        if "is_sample" not in cols:
            conn.execute("ALTER TABLE transactions ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0")
    return db_path


def list_tables() -> List[str]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
    return [str(r["name"]) for r in rows]
