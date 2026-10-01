import unittest
import sys
import os
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scraper.scraper import build_search_url, parse_listing_element, extract_variant

class TestScraper(unittest.TestCase):
    def test_build_search_url(self):
        url = build_search_url("suzuki", "alto", "lahore", page=1)
        self.assertEqual(url, "https://www.pakwheels.com/used-cars/search/-/mk_suzuki/md_alto/ct_lahore/")

        url2 = build_search_url("toyota", "corolla", "all", page=3)
        self.assertEqual(url2, "https://www.pakwheels.com/used-cars/search/-/mk_toyota/md_corolla/?page=3")

        url3 = build_search_url("honda", "all", "karachi", page=1)
        self.assertEqual(url3, "https://www.pakwheels.com/used-cars/search/-/mk_honda/ct_karachi/")

    def test_extract_variant(self):
        v = extract_variant("Suzuki Alto 2019 VXL AGS for Sale", "Suzuki", "Alto", 2019)
        self.assertEqual(v, "VXL AGS")

        v2 = extract_variant("Toyota Corolla 2022 Altis Grande X CVT-i 1.8 for Sale", "Toyota", "Corolla", 2022)
        self.assertIn("Altis Grande", v2)

    def test_parse_listing_with_json_ld(self):
        html_snippet = """
        <li class="classified-listing" data-listing-id="998877">
            <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@type": ["Product"],
                "name": "Suzuki Alto 2021 VXL AGS for sale in Lahore",
                "modelDate": 2021,
                "mileageFromOdometer": "45,000 km",
                "vehicleTransmission": "Automatic",
                "vehicleEngine": { "engineDisplacement": "660cc" },
                "fuelType": "Petrol",
                "image": "https://cache.pakwheels.com/test.jpg",
                "offers": {
                    "price": 2350000,
                    "url": "https://www.pakwheels.com/used-cars/suzuki-alto-2021-998877"
                }
            }
            </script>
            <a class="car-name">Suzuki Alto 2021 VXL AGS for sale in Lahore</a>
            <div class="price-details">PKR 23.5 lacs</div>
            <div class="dated">Updated 1 hour ago</div>
        </li>
        """
        soup = BeautifulSoup(html_snippet, 'html.parser')
        item = soup.select_one('.classified-listing')
        parsed = parse_listing_element(item, "Suzuki", "Alto", "Lahore")

        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["pakwheels_id"], 998877)
        self.assertEqual(parsed["price_pkr"], 2350000)
        self.assertEqual(parsed["year"], 2021)
        self.assertEqual(parsed["mileage_km"], 45000)
        self.assertEqual(parsed["transmission"], "Automatic")
        self.assertEqual(parsed["variant"], "VXL AGS")
        self.assertEqual(parsed["city"], "Lahore")

if __name__ == '__main__':
    unittest.main()
