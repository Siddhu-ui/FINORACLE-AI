import unittest
from datetime import date

from backend.ml.anomaly import detect_unusual_spending
from backend.ml.classifier import (
    CATEGORIES,
    classify_transaction,
    evaluate_classifier_benchmark,
)
from backend.ml.forecasting import forecast_monthly_expenses
from backend.services.insights_service import build_insights


class TestMLServices(unittest.TestCase):
    def test_classification_is_deterministic_across_12_categories(self):
        self.assertEqual(len(CATEGORIES), 12)
        res_food = classify_transaction("UPI/SWIGGY/DINNER ORDER")
        self.assertEqual(res_food["category"], "food")
        self.assertEqual(res_food["display_category"], "Food")
        self.assertGreater(res_food["confidence"], 0.3)

        res_inv = classify_transaction("ACH/ZERODHA COIN NIFTY 50 SIP")
        self.assertEqual(res_inv["category"], "investments")

        res_util = classify_transaction("BBPS/BESCOM ELECTRICITY BILL")
        self.assertEqual(res_util["category"], "utilities")

    def test_user_correction_override_takes_priority(self):
        corrections = [
            {"description": "ACME STUDIO PAYMENT", "corrected_category": "Education"}
        ]
        res = classify_transaction("ACME STUDIO PAYMENT", user_corrections=corrections)
        self.assertEqual(res["category"], "education")
        self.assertEqual(res["source"], "user_feedback")
        self.assertGreaterEqual(res["confidence"], 0.95)

    def test_benchmark_evaluation_beats_rule_baseline(self):
        report = evaluate_classifier_benchmark()
        self.assertEqual(report["dataset"]["source"], "benchmark")
        self.assertEqual(report["dataset"]["num_categories"], 12)
        self.assertEqual(len(report["ml_model"]["confusion_matrix"]), 12)
        self.assertGreater(
            report["ml_model"]["macro_f1"],
            report["baseline_model"]["macro_f1"],
        )

    def test_forecast_enforces_three_full_months_guard(self):
        result = forecast_monthly_expenses(
            [
                {"type": "expense", "date": "2026-01-15", "amount": 25000},
                {"type": "expense", "date": "2026-02-15", "amount": 27000},
            ],
            reference_date=date(2026, 3, 10),
        )
        self.assertFalse(result["available"])
        self.assertEqual(result["status"], "insufficient_data")
        self.assertEqual(result["months_needed"], 1)
        self.assertEqual(result["predictions"], [])

    def test_forecast_chronological_validation_and_uncertainty_band(self):
        txs = [
            {"type": "expense", "date": "2025-07-10", "amount": 30000},
            {"type": "expense", "date": "2025-08-10", "amount": 32000},
            {"type": "expense", "date": "2025-09-10", "amount": 31500},
            {"type": "expense", "date": "2025-10-10", "amount": 33500},
            {"type": "expense", "date": "2025-11-10", "amount": 34000},
            {"type": "expense", "date": "2025-12-10", "amount": 35500},
        ]
        result = forecast_monthly_expenses(txs, horizon_months=3, reference_date=date(2026, 1, 15))
        self.assertTrue(result["available"])
        self.assertEqual(result["status"], "ok")
        self.assertEqual(len(result["predictions"]), 3)
        self.assertIsNotNone(result["mae"])
        self.assertIsNotNone(result["rmse"])
        first = result["predictions"][0]
        self.assertLessEqual(first["lower_bound"], first["predicted_expense"])
        self.assertGreaterEqual(first["upper_bound"], first["predicted_expense"])

    def test_unusual_spending_isolation_forest_and_fallback(self):
        # Insufficient (<4)
        small = detect_unusual_spending([{"type": "expense", "date": "2026-01-01", "amount": 100}])
        self.assertFalse(small["available"])

        # Statistical fallback (4-9 items)
        medium_txs = [
            {"id": f"m{i}", "type": "expense", "date": f"2026-01-0{i+1}", "category": "Shopping", "description": f"Shop {i}", "amount": 1500}
            for i in range(6)
        ] + [
            {"id": "spike", "type": "expense", "date": "2026-01-20", "category": "Shopping", "description": "Electronics Mega Buy", "amount": 18500}
        ]
        med_res = detect_unusual_spending(medium_txs)
        self.assertTrue(med_res["available"])
        self.assertEqual(med_res["method"], "robust_iqr_zscore")
        self.assertTrue(any(a["transaction_id"] == "spike" for a in med_res["alerts"]))
        self.assertEqual(med_res["alerts"][0]["label"], "Unusual Spending")
        self.assertNotIn("confirmed fraud", med_res["alerts"][0]["explanation"].lower())

        # Isolation Forest (>=10 items)
        large_txs = [
            {"id": f"l{i}", "type": "expense", "date": f"2026-02-{(i%20)+1:02d}", "category": "Food", "description": f"Swiggy {i}", "amount": 450 + (i * 15)}
            for i in range(12)
        ] + [
            {"id": "big", "type": "expense", "date": "2026-02-22", "category": "Food", "description": "Banquet Catering", "amount": 14500}
        ]
        large_res = detect_unusual_spending(large_txs)
        self.assertTrue(large_res["available"])
        self.assertEqual(large_res["method"], "isolation_forest")
        self.assertTrue(any(a["transaction_id"] == "big" for a in large_res["alerts"]))

    def test_insights_use_recorded_values_and_evidence(self):
        result = build_insights(
            {},
            [
                {"type": "income", "date": "2026-02-01", "amount": 100000},
                {"type": "expense", "date": "2026-02-05", "amount": 60000, "category": "Food"},
            ],
            [],
            [],
            {"available": False},
            {"available": False},
        )
        self.assertEqual(result["summary"]["recorded_income"], 100000)
        self.assertEqual(result["summary"]["recorded_expenses"], 60000)
        self.assertGreater(len(result["insights"]), 0)
        for card in result["insights"]:
            self.assertIn("evidence", card)
            self.assertIn("metric_source", card["evidence"])


if __name__ == "__main__":
    unittest.main()
