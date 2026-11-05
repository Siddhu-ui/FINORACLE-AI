import unittest
from backend.services.calculations import calculate_loan_emi, simulate_financial_scenario

class TestFinancialCalculations(unittest.TestCase):
    def test_loan_emi_calculation(self):
        # Test ₹10,00,000 at 10% for 12 months
        res = calculate_loan_emi(
            principal=1000000,
            annual_rate_percent=10.0,
            tenure_months=12,
            processing_fee_percent=1.0,
            extra_monthly_prepayment=0
        )
        
        self.assertEqual(res["principal"], 1000000)
        self.assertEqual(res["annual_rate"], 10.0)
        self.assertEqual(res["tenure_months"], 12)
        self.assertTrue(87000 < res["emi"] < 89000)
        self.assertEqual(len(res["schedule"]), 12)
        self.assertEqual(res["schedule"][-1]["balance"], 0.0)
        self.assertTrue(res["total_repayment"] > 1000000)
        self.assertEqual(res["processing_fee"], 10000)

    def test_loan_prepayment_impact(self):
        prepaid = calculate_loan_emi(
            principal=2500000,
            annual_rate_percent=8.5,
            tenure_months=240,
            extra_monthly_prepayment=5000
        )
        
        self.assertTrue(prepaid["prepayment_impact"]["months_saved"] > 0)
        self.assertTrue(prepaid["prepayment_impact"]["interest_saved"] > 0)
        self.assertTrue(prepaid["prepayment_impact"]["actual_tenure_months"] < 240)

    def test_scenario_simulation(self):
        changes = [
            {"type": "income_increase", "label": "Salary Hike", "amount": 20000},
            {"type": "new_loan_emi", "label": "Car EMI", "amount": 10000},
            {"type": "one_time_expense", "label": "Down payment", "amount": 50000}
        ]
        
        result = simulate_financial_scenario(
            baseline_income=80000,
            baseline_expenses=50000,
            changes=changes
        )
        
        self.assertEqual(result["baseline"]["income"], 80000)
        self.assertEqual(result["baseline"]["expenses"], 50000)
        self.assertEqual(result["baseline"]["monthly_savings"], 30000)
        self.assertEqual(result["modified"]["income"], 100000)
        self.assertEqual(result["modified"]["expenses"], 60000)
        self.assertEqual(result["modified"]["monthly_savings"], 40000)
        self.assertEqual(result["impact"]["monthly_net_delta"], 10000)
        self.assertEqual(len(result["projection_12m"]), 12)

if __name__ == "__main__":
    unittest.main()
