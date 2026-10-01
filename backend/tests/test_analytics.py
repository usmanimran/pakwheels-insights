import unittest
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from analytics.engine import compute_market_analytics, format_pkr_lacs

class TestAnalyticsEngine(unittest.TestCase):
    def setUp(self):
        self.sample_listings = [
            {
                "id": 1,
                "pakwheels_id": 1001,
                "make": "Suzuki",
                "model": "Alto",
                "variant": "VXL AGS",
                "year": 2022,
                "price_pkr": 2600000,
                "mileage_km": 30000,
                "transmission": "Automatic",
                "title": "Suzuki Alto 2022 VXL AGS",
                "url": "https://pakwheels.com/1001"
            },
            {
                "id": 2,
                "pakwheels_id": 1002,
                "make": "Suzuki",
                "model": "Alto",
                "variant": "VXR",
                "year": 2022,
                "price_pkr": 2300000,
                "mileage_km": 40000,
                "transmission": "Manual",
                "title": "Suzuki Alto 2022 VXR",
                "url": "https://pakwheels.com/1002"
            },
            {
                "id": 3,
                "pakwheels_id": 1003,
                "make": "Suzuki",
                "model": "Alto",
                "variant": "VX",
                "year": 2020,
                "price_pkr": 1800000,
                "mileage_km": 65000,
                "transmission": "Manual",
                "title": "Suzuki Alto 2020 VX",
                "url": "https://pakwheels.com/1003"
            },
            {
                "id": 4,
                "pakwheels_id": 1004,
                "make": "Suzuki",
                "model": "Alto",
                "variant": "VXL AGS",
                "year": 2020,
                "price_pkr": 2100000,
                "mileage_km": 55000,
                "transmission": "Automatic",
                "title": "Suzuki Alto 2020 VXL AGS",
                "url": "https://pakwheels.com/1004"
            }
        ]

    def test_kpi_calculations(self):
        analytics = compute_market_analytics(self.sample_listings)
        self.assertEqual(analytics["total_listings"], 4)
        self.assertEqual(analytics["min_price"], 1800000)
        self.assertEqual(analytics["max_price"], 2600000)
        self.assertEqual(analytics["avg_price"], 2200000)
        self.assertEqual(analytics["median_price"], 2200000)
        self.assertEqual(analytics["avg_mileage"], 47500)

    def test_price_formatting(self):
        self.assertEqual(format_pkr_lacs(2485000), "24.85 Lacs")
        self.assertEqual(format_pkr_lacs(15200000), "1.52 Crore")
        self.assertEqual(format_pkr_lacs(50000), "50,000 PKR")

    def test_year_stats(self):
        analytics = compute_market_analytics(self.sample_listings)
        year_stats = analytics["year_stats"]
        self.assertEqual(len(year_stats), 2)
        # Year 2020
        y2020 = next(y for y in year_stats if y["year"] == 2020)
        self.assertEqual(y2020["count"], 2)
        self.assertEqual(y2020["avg_price"], 1950000)
        # Year 2022
        y2022 = next(y for y in year_stats if y["year"] == 2022)
        self.assertEqual(y2022["count"], 2)
        self.assertEqual(y2022["avg_price"], 2450000)

    def test_variants_query(self):
        import tempfile
        from database.db import init_db, upsert_listings, get_variants_for_model
        temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        temp_db.close()
        old_env = os.environ.get("PAKWHEELS_DB_PATH")
        os.environ["PAKWHEELS_DB_PATH"] = temp_db.name
        try:
            init_db()
            test_data = [
                {"pakwheels_id": 9001, "make": "TestMake", "model": "TestModel", "variant": "TrimA", "price_pkr": 2000000, "year": 2021},
                {"pakwheels_id": 9002, "make": "TestMake", "model": "TestModel", "variant": "TrimA", "price_pkr": 2100000, "year": 2022},
                {"pakwheels_id": 9003, "make": "TestMake", "model": "TestModel", "variant": "TrimB", "price_pkr": 2500000, "year": 2023},
            ]
            upsert_listings(test_data)
            variants = get_variants_for_model("TestMake", "TestModel")
            self.assertEqual(len(variants), 2)
            trim_a = next(v for v in variants if v["variant"] == "TrimA")
            self.assertEqual(trim_a["count"], 2)
        finally:
            if old_env is not None:
                os.environ["PAKWHEELS_DB_PATH"] = old_env
            else:
                os.environ.pop("PAKWHEELS_DB_PATH", None)
            if os.path.exists(temp_db.name):
                os.remove(temp_db.name)

if __name__ == '__main__':
    unittest.main()

