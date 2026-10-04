import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.db import (
    init_db,
    upsert_listings,
    get_all_records_for_analytics,
    query_listings,
    get_variants_for_model,
    record_scan_metadata,
    get_last_scan_metadata,
    parse_target_cities
)
from scraper.scraper import parse_listing_element
from bs4 import BeautifulSoup

import tempfile

class TestSQAAndFeatures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        cls.temp_db.close()
        cls.orig_env = os.environ.get("PAKWHEELS_DB_PATH")
        os.environ["PAKWHEELS_DB_PATH"] = cls.temp_db.name
        init_db()

    @classmethod
    def tearDownClass(cls):
        if cls.orig_env is not None:
            os.environ["PAKWHEELS_DB_PATH"] = cls.orig_env
        else:
            os.environ.pop("PAKWHEELS_DB_PATH", None)
        if os.path.exists(cls.temp_db.name):
            os.remove(cls.temp_db.name)

    def setUp(self):
        from database.db import get_connection
        conn = get_connection()
        conn.execute("DELETE FROM listings;")
        conn.execute("DELETE FROM scan_metadata;")
        conn.execute("DELETE FROM app_settings;")
        conn.commit()
        conn.close()

    def test_parse_target_cities(self):
        # Comma-separated string
        self.assertEqual(parse_target_cities("Lahore, Karachi"), ["lahore", "karachi"])
        # Single city string
        self.assertEqual(parse_target_cities("Islamabad"), ["islamabad"])
        # List of cities
        self.assertEqual(parse_target_cities(["Lahore", "Rawalpindi"]), ["lahore", "rawalpindi"])
        # All / All Pakistan / empty filtering
        self.assertEqual(parse_target_cities("All, Pakistan, Lahore"), ["lahore"])
        self.assertEqual(parse_target_cities(None, "Karachi"), ["karachi"])
        self.assertEqual(parse_target_cities(None, None), [])

    def test_city_isolation_and_sqa_bounds(self):
        # Insert test listings with distinct cities and an outlier price
        test_listings = [
            {
                "pakwheels_id": 80001,
                "make": "CityIsoMake",
                "model": "IsoModel",
                "variant": "V1",
                "year": 2022,
                "price_pkr": 2500000,
                "mileage_km": 20000,
                "city": "Lahore"
            },
            {
                "pakwheels_id": 80002,
                "make": "CityIsoMake",
                "model": "IsoModel",
                "variant": "V1",
                "year": 2022,
                "price_pkr": 2700000,
                "mileage_km": 15000,
                "city": "Islamabad"
            },
            {
                "pakwheels_id": 80003,
                "make": "CityIsoMake",
                "model": "IsoModel",
                "variant": "V2",
                "year": 2023,
                "price_pkr": 3000000,
                "mileage_km": 10000,
                "city": "Karachi"
            },
            # Outlier 1: PKR 500 (placeholder typo)
            {
                "pakwheels_id": 80004,
                "make": "CityIsoMake",
                "model": "IsoModel",
                "variant": "V1",
                "year": 2022,
                "price_pkr": 500,
                "mileage_km": 5000,
                "city": "Lahore"
            },
            # Outlier 2: PKR 999,999,999 (placeholder outlier)
            {
                "pakwheels_id": 80005,
                "make": "CityIsoMake",
                "model": "IsoModel",
                "variant": "V1",
                "year": 2022,
                "price_pkr": 999999999,
                "mileage_km": 5000,
                "city": "Lahore"
            }
        ]
        upsert_listings(test_listings)

        # 1. Query strictly Lahore: must only return Lahore, and ignore outliers (< 100k, > 500M)
        lahore_records = get_all_records_for_analytics(make="CityIsoMake", model="IsoModel", cities="Lahore")
        self.assertEqual(len(lahore_records), 1)
        self.assertEqual(lahore_records[0]["pakwheels_id"], 80001)
        self.assertEqual(lahore_records[0]["city"], "Lahore")

        # 2. Query multi-city: Lahore + Islamabad
        multi_records = get_all_records_for_analytics(make="CityIsoMake", model="IsoModel", cities="Lahore, Islamabad")
        self.assertEqual(len(multi_records), 2)
        cities_found = {r["city"].lower() for r in multi_records}
        self.assertEqual(cities_found, {"lahore", "islamabad"})

        # 3. Query Karachi alone
        karachi_records = get_all_records_for_analytics(make="CityIsoMake", model="IsoModel", cities="Karachi")
        self.assertEqual(len(karachi_records), 1)
        self.assertEqual(karachi_records[0]["city"], "Karachi")

        # 4. Query city with 0 listings
        peshawar_records = get_all_records_for_analytics(make="CityIsoMake", model="IsoModel", cities="Peshawar")
        self.assertEqual(len(peshawar_records), 0)

    def test_deduplication_upsert(self):
        # Insert initial listing
        initial = [{
            "pakwheels_id": 85001,
            "make": "DedupMake",
            "model": "DedupModel",
            "variant": "Base",
            "year": 2021,
            "price_pkr": 2000000,
            "mileage_km": 30000,
            "city": "Lahore"
        }]
        upsert_listings(initial)
        records_1 = get_all_records_for_analytics(make="DedupMake", model="DedupModel")
        self.assertEqual(len(records_1), 1)
        self.assertEqual(records_1[0]["price_pkr"], 2000000)

        # Re-fetch / upsert same listing with updated price and mileage
        updated = [{
            "pakwheels_id": 85001,
            "make": "DedupMake",
            "model": "DedupModel",
            "variant": "Base",
            "year": 2021,
            "price_pkr": 1950000,
            "mileage_km": 32000,
            "city": "Lahore"
        }]
        upsert_listings(updated)
        records_2 = get_all_records_for_analytics(make="DedupMake", model="DedupModel")
        # Must still be exactly 1 record, but updated in place
        self.assertEqual(len(records_2), 1)
        self.assertEqual(records_2[0]["price_pkr"], 1950000)
        self.assertEqual(records_2[0]["mileage_km"], 32000)

    def test_scan_metadata_tracking(self):
        record_scan_metadata(make="ScanMake", model="ScanModel", cities="Lahore", count=150, scan_type="all")
        meta = get_last_scan_metadata(make="ScanMake", model="ScanModel", cities="Lahore")
        self.assertIsNotNone(meta)
        self.assertEqual(meta["total_listings"], 150)
        self.assertIn("last_scraped_at", meta)

    def test_scraper_city_attribution_fix(self):
        # Simulated HTML card with Lahore in title even if default_city argument was "all"
        html = """
        <li class="classified-listing" data-listing-id="88801">
            <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@type": ["Product"],
                "name": "Toyota Corolla 2020 GLi 1.3 VVTi for sale in Lahore",
                "modelDate": 2020,
                "mileageFromOdometer": "50,000 km",
                "vehicleTransmission": "Manual",
                "offers": { "price": 3200000, "url": "https://pakwheels.com/88801" }
            }
            </script>
            <a class="car-name">Toyota Corolla 2020 GLi 1.3 VVTi for sale in Lahore</a>
            <ul class="search-vehicle-info-2">
                <li>Lahore</li>
                <li>Manual</li>
            </ul>
        </li>
        """
        soup = BeautifulSoup(html, 'html.parser')
        item = soup.select_one('.classified-listing')
        # Even if default_city passed is "Karachi" (e.g. injected featured listing),
        # parse_listing_element must extract true city "Lahore"
        parsed = parse_listing_element(item, "Toyota", "Corolla", "Karachi")
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["city"], "Lahore")

    def test_whole_market_query_and_compare(self):
        # Insert diverse vehicles from different makes and model years
        market_data = [
            {"pakwheels_id": 91001, "make": "Honda", "model": "Civic", "variant": "VTi Oriel", "year": 2017, "price_pkr": 2800000, "city": "Lahore"},
            {"pakwheels_id": 91002, "make": "Suzuki", "model": "Wagon R", "variant": "VXL", "year": 2018, "price_pkr": 1900000, "city": "Karachi"},
            {"pakwheels_id": 91003, "make": "Toyota", "model": "Yaris", "variant": "ATIV CVT", "year": 2021, "price_pkr": 3800000, "city": "Lahore"},
            {"pakwheels_id": 91004, "make": "Kia", "model": "Sportage", "variant": "FWD", "year": 2022, "price_pkr": 6200000, "city": "Islamabad"},
        ]
        upsert_listings(market_data)

        # Era 1: 2015–2019 Whole Market
        era_1 = get_all_records_for_analytics(make="All Makes", min_year=2015, max_year=2019)
        self.assertEqual(len(era_1), 2)
        makes_1 = {r["make"] for r in era_1}
        self.assertEqual(makes_1, {"Honda", "Suzuki"})

        # Era 2: 2020–2025 Whole Market
        era_2 = get_all_records_for_analytics(make="All Makes", min_year=2020, max_year=2025)
        self.assertEqual(len(era_2), 2)
        makes_2 = {r["make"] for r in era_2}
        self.assertEqual(makes_2, {"Toyota", "Kia"})

    def test_generate_segment_title(self):
        from main import generate_segment_title

        # Whole Market with year era
        t1 = generate_segment_title("All Makes", "All Models", "All Variants", "All Pakistan", 2015, 2019)
        self.assertEqual(t1, "Whole Market (2015–2019) in Pakistan")

        # Whole Market in a city
        t2 = generate_segment_title("All Makes", "All Models", "All Variants", "Lahore", None, None)
        self.assertEqual(t2, "Whole Market in Lahore")

        # Brand comparison
        t3 = generate_segment_title("Toyota", "All Models", "All Variants", "All Pakistan", 2018, 2024)
        self.assertEqual(t3, "All Toyota Models (2018–2024) in Pakistan")

        # Specific car
        t4 = generate_segment_title("Suzuki", "Alto", "VXL AGS", "Lahore", 2022, 2022)
        self.assertEqual(t4, "Suzuki Alto (VXL AGS) (2022) in Lahore")

    def test_market_snapshots_creation_and_query(self):
        from database.db import create_market_snapshot, get_market_snapshots, query_listings, get_all_records_for_analytics
        listings_batch = [
            {"pakwheels_id": 9001, "make": "Suzuki", "model": "Alto", "price_pkr": 2500000, "mileage_km": 20000, "year": 2022, "city": "Lahore"},
            {"pakwheels_id": 9002, "make": "Suzuki", "model": "Alto", "price_pkr": 2700000, "mileage_km": 15000, "year": 2023, "city": "Lahore"},
        ]
        snap_id = create_market_snapshot("Suzuki", "Alto", "Lahore", "all", listings_batch)
        self.assertGreater(snap_id, 0)

        # Verify snapshot appears in list
        snaps = get_market_snapshots("Suzuki", "Alto")
        self.assertTrue(any(s["id"] == snap_id for s in snaps))
        found = next(s for s in snaps if s["id"] == snap_id)
        self.assertEqual(found["total_listings"], 2)
        self.assertEqual(found["avg_price_lacs"], 26.0)

        # Query listings by snapshot_id
        res = query_listings(make="Suzuki", model="Alto", snapshot_id=snap_id)
        self.assertEqual(res["total"], 2)
        self.assertEqual({it["pakwheels_id"] for it in res["items"]}, {9001, 9002})

        # Query analytics by snapshot_id
        records = get_all_records_for_analytics(make="Suzuki", model="Alto", snapshot_id=snap_id)
        self.assertEqual(len(records), 2)

    def test_proxy_settings_endpoints(self):
        from fastapi.testclient import TestClient
        from main import app
        client = TestClient(app)

        # 1. Get proxy setting
        r1 = client.get("/api/settings/proxy")
        self.assertEqual(r1.status_code, 200)

        # 2. Save proxy setting
        r2 = client.post("/api/settings/proxy", json={"proxy": "http://user:pass@127.0.0.1:8080"})
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["status"], "ok")

        # 3. Verify it is set
        r3 = client.get("/api/settings/proxy")
        self.assertEqual(r3.status_code, 200)
        self.assertTrue(r3.json()["is_configured"])

        # 4. Clear proxy setting
        r4 = client.post("/api/settings/proxy", json={"proxy": ""})
        self.assertEqual(r4.status_code, 200)
        r5 = client.get("/api/settings/proxy")
        self.assertEqual(r5.json()["proxy"], "")

    def test_z_db_export_and_import(self):
        from fastapi.testclient import TestClient
        from main import app
        client = TestClient(app)

        # 1. Test export
        export_resp = client.get("/api/db/export")
        self.assertEqual(export_resp.status_code, 200)
        self.assertTrue(export_resp.content.startswith(b"SQLite format 3"))

        # 2. Test import with invalid content
        bad_import = client.post("/api/db/import", files={"file": ("test.db", b"not a valid sqlite file")})
        self.assertEqual(bad_import.status_code, 400)

        # 3. Test import with valid content
        good_import = client.post("/api/db/import", files={"file": ("pakwheels.db", export_resp.content)})
        self.assertEqual(good_import.status_code, 200)
        self.assertEqual(good_import.json()["status"], "ok")

if __name__ == '__main__':
    unittest.main()

