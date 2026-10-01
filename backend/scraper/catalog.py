import re
import asyncio
import logging
from typing import List, Dict, Any
import httpx
from bs4 import BeautifulSoup
from database.db import save_car_catalog, get_catalog_hierarchy

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

POPULAR_CITIES = [
    {"name": "All Pakistan", "slug": "all"},
    {"name": "Lahore", "slug": "lahore"},
    {"name": "Karachi", "slug": "karachi"},
    {"name": "Islamabad", "slug": "islamabad"},
    {"name": "Rawalpindi", "slug": "rawalpindi"},
    {"name": "Faisalabad", "slug": "faisalabad"},
    {"name": "Multan", "slug": "multan"},
    {"name": "Peshawar", "slug": "peshawar"},
    {"name": "Gujranwala", "slug": "gujranwala"},
    {"name": "Sialkot", "slug": "sialkot"},
    {"name": "Quetta", "slug": "quetta"},
    {"name": "Bahawalpur", "slug": "bahawalpur"},
    {"name": "Sargodha", "slug": "sargodha"},
    {"name": "Abbottabad", "slug": "abbottabad"},
    {"name": "Hyderabad", "slug": "hyderabad"},
    {"name": "Gujrat", "slug": "gujrat"},
]

POPULAR_MAKES = [
    "Suzuki", "Toyota", "Honda", "KIA", "Hyundai", 
    "Changan", "MG", "Daihatsu", "Nissan", "Proton", 
    "Haval", "Chery", "BAIC", "DFSK", "Audi", "BMW", "Mercedes Benz"
]

def normalize_slug(text: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9\s\-]', '', text).strip().lower()
    return re.sub(r'[\s_]+', '-', cleaned)

async def scrape_full_catalog() -> List[Dict[str, Any]]:
    """Scrapes all makes and models from PakWheels sitemap."""
    url = "https://www.pakwheels.com/sitemap/"
    catalog_items: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(headers=HEADERS, timeout=20.0, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.error(f"Failed to fetch sitemap: status {resp.status_code}")
                return catalog_items

            soup = BeautifulSoup(resp.text, "html.parser")
            groups = soup.select(".sitemaps-group")

            for group in groups:
                header = group.select_one(".box-header h4, h4")
                if not header:
                    continue
                make_name = header.get_text(strip=True)
                if not make_name or len(make_name) <= 1:
                    continue

                make_slug = normalize_slug(make_name)
                links = group.select("ul.sitemaps-box a")
                for a in links:
                    model_name = a.get_text(strip=True)
                    if not model_name:
                        continue
                    href = a.get("href", "")
                    # Extract numeric ID and model slug from href e.g. /used-cars/suzuki-alto/658
                    m = re.search(r'/used-cars/([a-z0-9\-]+)/(\d+)', href)
                    pw_id = m.group(2) if m else None
                    
                    # Compute clean model slug (strip make prefix if present)
                    raw_slug = m.group(1) if m else normalize_slug(model_name)
                    # e.g. 'suzuki-alto' -> 'alto'
                    if raw_slug.startswith(f"{make_slug}-"):
                        model_slug = raw_slug[len(make_slug) + 1:]
                    else:
                        model_slug = normalize_slug(model_name)

                    catalog_items.append({
                        "make_name": make_name,
                        "make_slug": make_slug,
                        "model_name": model_name,
                        "model_slug": model_slug,
                        "pakwheels_id": pw_id,
                        "category": "used-cars"
                    })

        except Exception as e:
            logger.error(f"Error scraping catalog: {e}", exc_info=True)

    if catalog_items:
        save_car_catalog(catalog_items)
        logger.info(f"Successfully saved {len(catalog_items)} car models to catalog database.")

    return catalog_items

def ensure_catalog_seeded():
    """Checks if catalog is seeded; if not, triggers scrape."""
    hierarchy = get_catalog_hierarchy()
    if not hierarchy:
        logger.info("Catalog empty. Running initial taxonomy scrape...")
        asyncio.run(scrape_full_catalog())
