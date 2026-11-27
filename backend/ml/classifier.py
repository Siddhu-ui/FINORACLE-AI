"""Transaction Classification Engine (Scikit-learn TF-IDF + LogisticRegression vs Rule Baseline).

Supports 12 canonical categories, benchmark evaluation with Precision/Recall/Macro-F1/Confusion Matrix,
and user-scoped correction overrides / incremental personalization without mixing benchmark data
with user financial records.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline

CATEGORIES: List[str] = [
    "food",
    "groceries",
    "transport",
    "shopping",
    "education",
    "healthcare",
    "utilities",
    "housing",
    "entertainment",
    "travel",
    "investments",
    "income",
]

CATEGORY_DISPLAY_MAP: Dict[str, str] = {
    "food": "Food",
    "groceries": "Groceries",
    "transport": "Transportation",
    "shopping": "Shopping",
    "education": "Education",
    "healthcare": "Healthcare",
    "utilities": "Utilities",
    "housing": "Housing",
    "entertainment": "Entertainment",
    "travel": "Travel",
    "investments": "Investments",
    "income": "Salary",
}

REVERSE_CATEGORY_MAP: Dict[str, str] = {
    "food": "food",
    "food & dining": "food",
    "dining": "food",
    "groceries": "groceries",
    "grocery": "groceries",
    "transport": "transport",
    "transportation": "transport",
    "shopping": "shopping",
    "education": "education",
    "healthcare": "healthcare",
    "health": "healthcare",
    "medical": "healthcare",
    "utilities": "utilities",
    "bills": "utilities",
    "housing": "housing",
    "rent": "housing",
    "entertainment": "entertainment",
    "travel": "travel",
    "investments": "investments",
    "investment": "investments",
    "savings": "investments",
    "income": "income",
    "salary": "income",
    "freelance": "income",
    "business": "income",
    "dividends": "income",
    "rental income": "income",
    "other income": "income",
}

BENCHMARK_PATH = Path(__file__).resolve().parent / "datasets" / "indian_transactions_benchmark.json"


def normalize_text(text: str) -> str:
    cleaned = re.sub(r"[^a-z0-9\s]", " ", (text or "").lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def canonicalize_category(label: str) -> str:
    norm = (label or "").strip().lower()
    return REVERSE_CATEGORY_MAP.get(norm, norm if norm in CATEGORIES else "shopping")


class RuleBasedTransactionClassifier:
    """Keyword/regex rule-based baseline across all 12 categories."""

    RULES: Dict[str, Tuple[str, ...]] = {
        "groceries": (
            r"\bblinkit\b",
            r"\bzepto\b",
            r"\bbigbasket\b",
            r"\binstamart\b",
            r"\bdmart\b",
            r"\bgrocer",
            r"\bsupermarket\b",
            r"\bkirana\b",
            r"\bmilk\b",
            r"\bvegetable",
            r"\bjiomart\b",
        ),
        "food": (
            r"\bswiggy\b",
            r"\bzomato\b",
            r"\bdomino",
            r"\bstarbucks\b",
            r"\brestaurant\b",
            r"\bcafe\b",
            r"\bcoffee\b",
            r"\bpizza\b",
            r"\bbiryani\b",
            r"\bdinner\b",
            r"\blunch\b",
            r"\bbreakfast\b",
            r"\bfood\b",
        ),
        "transport": (
            r"\buber\b",
            r"\bola\b",
            r"\brapido\b",
            r"\bpetrol\b",
            r"\bdiesel\b",
            r"\bfuel\b",
            r"\bmetro\b",
            r"\bfastag\b",
            r"\btoll\b",
            r"\bparking\b",
            r"\bauto\b",
            r"\bcab\b",
        ),
        "travel": (
            r"\birctc\b",
            r"\bindigo\b",
            r"\bmakemytrip\b",
            r"\bredbus\b",
            r"\bgoibibo\b",
            r"\bairbnb\b",
            r"\bflight\b",
            r"\bhotel\b",
            r"\btrain\b",
            r"\bcleartrip\b",
            r"\boyo\b",
        ),
        "shopping": (
            r"\bamazon\b",
            r"\bflipkart\b",
            r"\bmyntra\b",
            r"\bajio\b",
            r"\bnykaa\b",
            r"\bcroma\b",
            r"\bdecathlon\b",
            r"\bshoes\b",
            r"\bclothing\b",
            r"\bmall\b",
        ),
        "education": (
            r"\bcoursera\b",
            r"\budemy\b",
            r"\btuition\b",
            r"\bschool\b",
            r"\bcollege\b",
            r"\buniversity\b",
            r"\bexam\b",
            r"\bcoaching\b",
            r"\bbook",
            r"\bcourse\b",
        ),
        "healthcare": (
            r"\bapollo\b",
            r"\bpharmeasy\b",
            r"\bpharmacy\b",
            r"\bhospital\b",
            r"\bdoctor\b",
            r"\bclinic\b",
            r"\bmedic",
            r"\b1mg\b",
            r"\bpracto\b",
            r"\bpathlab",
            r"\bhealth insurance\b",
        ),
        "utilities": (
            r"\belectricity\b",
            r"\bbescom\b",
            r"\bjiofiber\b",
            r"\bairtel\b",
            r"\bbroadband\b",
            r"\bwifi\b",
            r"\bpostpaid\b",
            r"\bprepaid\b",
            r"\brecharge\b",
            r"\bgas\b",
            r"\bwater\b",
            r"\bpower bill\b",
        ),
        "housing": (
            r"\brent\b",
            r"\bnobroker\b",
            r"\bsociety\b",
            r"\bmaintenance\b",
            r"\bapartment\b",
            r"\bhome loan\b",
            r"\bhousing\b",
            r"\blandlord\b",
            r"\bproperty tax\b",
        ),
        "entertainment": (
            r"\bnetflix\b",
            r"\bspotify\b",
            r"\bhotstar\b",
            r"\bbookmyshow\b",
            r"\bmovie\b",
            r"\bcinema\b",
            r"\bpvr\b",
            r"\binox\b",
            r"\bprime video\b",
            r"\bconcert\b",
        ),
        "investments": (
            r"\bsip\b",
            r"\bmutual fund\b",
            r"\bzerodha\b",
            r"\bgroww\b",
            r"\belss\b",
            r"\bppf\b",
            r"\bnps\b",
            r"\bfixed deposit\b",
            r"\bsgb\b",
            r"\bkuvera\b",
        ),
        "income": (
            r"\bsalary\b",
            r"\bpayroll\b",
            r"\bdividend\b",
            r"\bbonus\b",
            r"\bfreelance\b",
            r"\bstipend\b",
            r"\btax refund\b",
            r"\binterest credit\b",
            r"\binvoice\b",
        ),
    }

    def predict_one(self, text: str) -> Tuple[str, float]:
        norm = normalize_text(text)
        best_cat = "shopping"
        best_hits = 0
        for cat, patterns in self.RULES.items():
            hits = sum(1 for p in patterns if re.search(p, norm))
            if hits > best_hits:
                best_hits = hits
                best_cat = cat
        confidence = min(0.92, 0.55 + 0.15 * best_hits) if best_hits > 0 else 0.20
        return best_cat, round(confidence, 4)

    def predict(self, texts: List[str]) -> List[str]:
        return [self.predict_one(t)[0] for t in texts]


@lru_cache(maxsize=1)
def load_benchmark_dataset() -> Dict[str, Any]:
    with BENCHMARK_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    return data


def _build_pipeline() -> Pipeline:
    return Pipeline(
        [
            (
                "tfidf",
                FeatureUnion(
                    [
                        (
                            "word",
                            TfidfVectorizer(
                                lowercase=True,
                                ngram_range=(1, 2),
                                sublinear_tf=True,
                                min_df=1,
                                token_pattern=r"(?u)\b[a-zA-Z0-9]{2,}\b",
                            ),
                        ),
                        (
                            "char",
                            TfidfVectorizer(
                                lowercase=True,
                                analyzer="char_wb",
                                ngram_range=(3, 5),
                                sublinear_tf=True,
                                min_df=2,
                            ),
                        ),
                    ]
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=1000,
                    C=4.0,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )


@lru_cache(maxsize=1)
def _get_base_ml_pipeline() -> Pipeline:
    dataset = load_benchmark_dataset()
    records = dataset["records"]
    texts = [normalize_text(r["text"]) for r in records]
    labels = [r["category"] for r in records]
    pipe = _build_pipeline()
    pipe.fit(texts, labels)
    return pipe


def _get_personalized_pipeline(
    user_corrections: List[Dict[str, Any]],
) -> Pipeline:
    """Incrementally blend user corrections into a per-request model without mutating global state."""
    dataset = load_benchmark_dataset()
    records = dataset["records"]
    texts = [normalize_text(r["text"]) for r in records]
    labels = [r["category"] for r in records]

    # Repeat user corrections 3x so user vocabulary carries higher weight during incremental fitting
    for corr in user_corrections:
        desc = normalize_text(str(corr.get("description") or ""))
        cat = canonicalize_category(str(corr.get("corrected_category") or ""))
        if desc and cat in CATEGORIES:
            for _ in range(3):
                texts.append(desc)
                labels.append(cat)

    pipe = _build_pipeline()
    pipe.fit(texts, labels)
    return pipe


def classify_transaction(
    description: str,
    category_hint: str = "",
    user_corrections: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Classify a single transaction narration into one of the 12 canonical categories.

    Priority order:
    1. Exact normalized match in authenticated user's persisted corrections (`user_override`).
    2. Personalized TF-IDF + LogisticRegression (if user has >= 3 corrections) or base benchmark ML model.
    3. Rule-based tie-breaker boost only when ML confidence is low (< 0.25) and rule matches strongly.
    """
    norm_desc = normalize_text(description)
    combined = normalize_text(f"{description} {category_hint}".strip())
    corrections = user_corrections or []

    # 1. Check user override priority
    for corr in corrections:
        corr_desc = normalize_text(str(corr.get("description") or ""))
        corr_cat = str(corr.get("corrected_category") or "").strip()
        if corr_desc and norm_desc and (corr_desc == norm_desc or corr_desc in norm_desc):
            canonical = canonicalize_category(corr_cat)
            return {
                "category": canonical,
                "display_category": corr_cat if corr_cat else CATEGORY_DISPLAY_MAP.get(canonical, canonical.title()),
                "confidence": 0.99,
                "model": "user-correction-override-v1",
                "source": "user_feedback",
                "top_alternatives": [],
            }

    # 2. ML pipeline prediction
    if len(corrections) >= 3:
        pipe = _get_personalized_pipeline(corrections)
        model_name = "tfidf-logreg-personalized-v1"
    else:
        pipe = _get_base_ml_pipeline()
        model_name = "tfidf-logistic-regression-v1"

    probs = pipe.predict_proba([combined or norm_desc])[0]
    classes = list(pipe.named_steps["clf"].classes_)
    order = np.argsort(probs)[::-1]

    top_idx = int(order[0])
    ml_cat = str(classes[top_idx])
    ml_conf = float(probs[top_idx])

    alternatives = [
        {
            "category": str(classes[int(idx)]),
            "display_category": CATEGORY_DISPLAY_MAP.get(str(classes[int(idx)]), str(classes[int(idx)]).title()),
            "confidence": round(float(probs[int(idx)]), 4),
        }
        for idx in order[1:3]
    ]

    # 3. Rule check for unseen brand keywords where TF-IDF vocabulary has low confidence
    rule_clf = RuleBasedTransactionClassifier()
    rule_cat, rule_conf = rule_clf.predict_one(combined or norm_desc)
    final_cat = ml_cat
    final_conf = ml_conf
    if ml_conf < 0.25 and rule_conf >= 0.55:
        final_cat = rule_cat
        final_conf = rule_conf
        model_name = "tfidf-logreg-with-rule-assist-v1"

    return {
        "category": final_cat,
        "display_category": CATEGORY_DISPLAY_MAP.get(final_cat, final_cat.title()),
        "confidence": round(final_conf, 4),
        "model": model_name,
        "source": "ml_pipeline",
        "top_alternatives": alternatives,
    }


def classify_transactions_batch(
    items: List[Dict[str, Any]],
    user_corrections: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    results = []
    for item in items:
        pred = classify_transaction(
            description=str(item.get("description") or ""),
            category_hint=str(item.get("category_hint") or ""),
            user_corrections=user_corrections,
        )
        results.append(
            {
                "id": item.get("id"),
                "description": item.get("description"),
                "current_category": item.get("category"),
                **pred,
            }
        )
    return results


@lru_cache(maxsize=1)
def evaluate_classifier_benchmark() -> Dict[str, Any]:
    """Compare TF-IDF + LogisticRegression against Rule-Based Baseline on the benchmark dataset.

    Reports Precision, Recall, Macro-F1, Weighted-F1, Accuracy, 5-fold CV Macro-F1,
    per-category F1, and full 12x12 Confusion Matrix.
    """
    dataset = load_benchmark_dataset()
    meta = dataset["metadata"]
    records = dataset["records"]

    texts = [normalize_text(r["text"]) for r in records]
    labels = [r["category"] for r in records]

    X_train, X_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.25,
        random_state=42,
        stratify=labels,
    )

    # 1. ML model evaluation
    ml_pipe = _build_pipeline()
    ml_pipe.fit(X_train, y_train)
    ml_preds = list(ml_pipe.predict(X_test))

    ml_prec_macro, ml_rec_macro, ml_f1_macro, _ = precision_recall_fscore_support(
        y_test, ml_preds, labels=CATEGORIES, average="macro", zero_division=0
    )
    ml_prec_weighted, ml_rec_weighted, ml_f1_weighted, _ = precision_recall_fscore_support(
        y_test, ml_preds, labels=CATEGORIES, average="weighted", zero_division=0
    )
    ml_acc = accuracy_score(y_test, ml_preds)
    ml_cm = confusion_matrix(y_test, ml_preds, labels=CATEGORIES).tolist()

    per_class_p, per_class_r, per_class_f1, per_class_sup = precision_recall_fscore_support(
        y_test, ml_preds, labels=CATEGORIES, average=None, zero_division=0
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(_build_pipeline(), texts, labels, cv=cv, scoring="f1_macro")

    # 2. Rule-based baseline evaluation on identical holdout test split
    baseline = RuleBasedTransactionClassifier()
    base_preds = baseline.predict(X_test)

    b_prec_macro, b_rec_macro, b_f1_macro, _ = precision_recall_fscore_support(
        y_test, base_preds, labels=CATEGORIES, average="macro", zero_division=0
    )
    b_prec_weighted, b_rec_weighted, b_f1_weighted, _ = precision_recall_fscore_support(
        y_test, base_preds, labels=CATEGORIES, average="weighted", zero_division=0
    )
    b_acc = accuracy_score(y_test, base_preds)
    b_cm = confusion_matrix(y_test, base_preds, labels=CATEGORIES).tolist()

    per_class_report = []
    for idx, cat in enumerate(CATEGORIES):
        per_class_report.append(
            {
                "category": cat,
                "precision": round(float(per_class_p[idx]), 4),
                "recall": round(float(per_class_r[idx]), 4),
                "f1": round(float(per_class_f1[idx]), 4),
                "support": int(per_class_sup[idx]),
            }
        )

    return {
        "dataset": {
            "name": meta["dataset_name"],
            "version": meta["version"],
            "source": meta["source"],
            "total_samples": len(records),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "num_categories": len(CATEGORIES),
            "categories": CATEGORIES,
        },
        "ml_model": {
            "name": "TF-IDF (1,2-gram) + LogisticRegression",
            "accuracy": round(float(ml_acc), 4),
            "macro_precision": round(float(ml_prec_macro), 4),
            "macro_recall": round(float(ml_rec_macro), 4),
            "macro_f1": round(float(ml_f1_macro), 4),
            "weighted_precision": round(float(ml_prec_weighted), 4),
            "weighted_recall": round(float(ml_rec_weighted), 4),
            "weighted_f1": round(float(ml_f1_weighted), 4),
            "cv_5fold_macro_f1_mean": round(float(np.mean(cv_scores)), 4),
            "cv_5fold_macro_f1_std": round(float(np.std(cv_scores)), 4),
            "confusion_matrix": ml_cm,
            "per_class": per_class_report,
        },
        "baseline_model": {
            "name": "Keyword/Regex Rule-Based Baseline",
            "accuracy": round(float(b_acc), 4),
            "macro_precision": round(float(b_prec_macro), 4),
            "macro_recall": round(float(b_rec_macro), 4),
            "macro_f1": round(float(b_f1_macro), 4),
            "weighted_precision": round(float(b_prec_weighted), 4),
            "weighted_recall": round(float(b_rec_weighted), 4),
            "weighted_f1": round(float(b_f1_weighted), 4),
            "confusion_matrix": b_cm,
        },
        "improvement_over_baseline": {
            "macro_f1_delta": round(float(ml_f1_macro - b_f1_macro), 4),
            "accuracy_delta": round(float(ml_acc - b_acc), 4),
        },
    }
