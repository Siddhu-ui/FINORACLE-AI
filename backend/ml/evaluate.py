"""CLI benchmark evaluator for FinOracle AI Transaction Classification.

Run:
    python -m backend.ml.evaluate
"""
from __future__ import annotations

import json

from backend.ml.classifier import evaluate_classifier_benchmark


def main() -> None:
    report = evaluate_classifier_benchmark()
    ml = report["ml_model"]
    base = report["baseline_model"]
    ds = report["dataset"]

    print("=" * 72)
    print(f"FinOracle AI ML Benchmark Evaluation — {ds['name']} v{ds['version']}")
    print(f"Dataset source: {ds['source']} | Samples: {ds['total_samples']} ({ds['train_samples']} train / {ds['test_samples']} test)")
    print("=" * 72)
    print(f"{'Model':<40} {'Acc':>7} {'Prec(M)':>8} {'Rec(M)':>8} {'F1(M)':>8}")
    print("-" * 72)
    print(
        f"{ml['name']:<40} {ml['accuracy']:>7.4f} {ml['macro_precision']:>8.4f} "
        f"{ml['macro_recall']:>8.4f} {ml['macro_f1']:>8.4f}"
    )
    print(
        f"{base['name']:<40} {base['accuracy']:>7.4f} {base['macro_precision']:>8.4f} "
        f"{base['macro_recall']:>8.4f} {base['macro_f1']:>8.4f}"
    )
    print("-" * 72)
    print(
        f"5-Fold Stratified CV Macro-F1 (ML): {ml['cv_5fold_macro_f1_mean']:.4f} "
        f"+/- {ml['cv_5fold_macro_f1_std']:.4f}"
    )
    print(
        f"Macro-F1 Improvement over Baseline: {report['improvement_over_baseline']['macro_f1_delta']:+.4f}"
    )
    print("\nJSON Summary:")
    print(json.dumps({k: v for k, v in report.items() if k != "ml_model"}, indent=2))


if __name__ == "__main__":
    main()
