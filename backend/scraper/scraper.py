import re
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional, AsyncGenerator, Tuple
import httpx
from bs4 import BeautifulSoup
from database.db import upsert_listings, record_scan_metadata

try:
    from curl_cffi.requests import AsyncSession
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.pakwheels.com/",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
}

def clean_int(val: Any) -> Optional[int]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return int(val)
    # Remove commas, km, cc, PKR, non-numeric
    s = re.sub(r'[^\d]', '', str(val))
    return int(s) if s else None

def extract_variant(title: str, make: str, model: str, year: Optional[int]) -> str:
    """Extracts variant name like VXL AGS, Altis Grande, RS Turbo, etc."""
    if not title:
        return ""
    text = title
    # Remove 'for Sale', 'for sale in ...'
    text = re.sub(r'for sale.*', '', text, flags=re.I)
    # Remove make, model, year
    if make:
        text = re.sub(re.escape(make), '', text, flags=re.I)
    if model:
        text = re.sub(re.escape(model), '', text, flags=re.I)
    if year:
        text = re.sub(r'\b' + str(year) + r'\b', '', text)
    # Clean extra punctuation and spaces
    cleaned = re.sub(r'[()\-_/]+', ' ', text).strip()
    return " ".join(cleaned.split())

def parse_listing_element(item, default_make: str, default_model: str, default_city: str) -> Optional[Dict[str, Any]]:
    """Parses a single classified-listing element using both JSON-LD and HTML specs."""
    try:
        pw_id_raw = item.get("data-listing-id") or item.get("id")
        pw_id = clean_int(pw_id_raw)

        # Check for JSON-LD script
        json_ld_script = item.select_one('script[type="application/ld+json"]')
        ld_data = {}
        if json_ld_script and json_ld_script.string:
            try:
                ld_data = json.loads(json_ld_script.string)
            except Exception:
                pass

        # Offer details from JSON-LD
        offers = ld_data.get("offers", {}) if isinstance(ld_data.get("offers"), dict) else {}
        price = clean_int(offers.get("price"))

        # Fallback price from HTML if not in JSON-LD
        if not price:
            price_el = item.select_one(".price-details")
            if price_el:
                price_text = price_el.get_text(strip=True).upper()
                # Parse lacs or crore
                if "LACS" in price_text or "LAC" in price_text:
                    m = re.search(r'([\d.]+)', price_text)
                    if m:
                        price = int(float(m.group(1)) * 100000)
                elif "CRORE" in price_text:
                    m = re.search(r'([\d.]+)', price_text)
                    if m:
                        price = int(float(m.group(1)) * 10000000)
                else:
                    price = clean_int(price_text)

        if not price or price <= 10000:
            # Skip invalid or placeholder prices
            return None

        # Year
        year = clean_int(ld_data.get("modelDate"))
        # Specs list from HTML
        specs_li = [li.get_text(strip=True) for li in item.select(".search-vehicle-info li, .item-details li, .search-vehicle-info-2 li")]
        
        # If year not in JSON-LD, find 4-digit year in specs or title
        if not year:
            for s in specs_li:
                if re.match(r'^(19\d\d|20\d\d)$', s):
                    year = int(s)
                    break

        # Mileage
        mileage = clean_int(ld_data.get("mileageFromOdometer"))
        if not mileage:
            for s in specs_li:
                if "km" in s.lower():
                    mileage = clean_int(s)
                    break

        # Engine CC
        engine_cc = None
        if "vehicleEngine" in ld_data and isinstance(ld_data["vehicleEngine"], dict):
            engine_cc = clean_int(ld_data["vehicleEngine"].get("engineDisplacement"))
        if not engine_cc:
            for s in specs_li:
                if "cc" in s.lower():
                    engine_cc = clean_int(s)
                    break

        # Transmission
        transmission = ld_data.get("vehicleTransmission")
        if not transmission:
            for s in specs_li:
                if s.lower() in ["automatic", "manual"]:
                    transmission = s.capitalize()
                    break
        if not transmission:
            transmission = "Manual"  # default fallback

        # Fuel type
        fuel_type = ld_data.get("fuelType")
        if not fuel_type:
            for s in specs_li:
                if s.lower() in ["petrol", "diesel", "hybrid", "cng", "electric"]:
                    fuel_type = s.capitalize()
                    break

        # Title & URL
        title_el = item.select_one(".car-name") or item.select_one("h3") or item.select_one("a.ad-detail-path")
        title = title_el.get_text(strip=True) if title_el else ld_data.get("name", f"{default_make} {default_model}")
        
        url = offers.get("url")
        if not url and title_el and title_el.get("href"):
            href = title_el.get("href")
            url = f"https://www.pakwheels.com{href}" if href.startswith("/") else href

        if not pw_id and url:
            m = re.search(r'-(\d+)$', url.split("?")[0])
            if m:
                pw_id = int(m.group(1))

        if not pw_id:
            return None

        # Image URL
        image_url = ld_data.get("image")
        if not image_url:
            img_el = item.select_one("img.lazy-search, img")
            if img_el:
                image_url = img_el.get("data-original") or img_el.get("src")

        # City / Location - Extract true vehicle location
        # Check ad title first (e.g. "Suzuki Alto 2019 for sale in Lahore")
        detected_city = None
        m_city = re.search(r'for sale in ([a-zA-Z\s]+)', title, re.I)
        if m_city:
            detected_city = m_city.group(1).strip()

        # Next check card specs list
        if not detected_city:
            for s in specs_li:
                if any(c in s.lower() for c in [
                    "lahore", "karachi", "islamabad", "rawalpindi", "faisalabad",
                    "multan", "peshawar", "gujranwala", "sialkot", "quetta",
                    "bahawalpur", "sargodha", "abbottabad", "hyderabad", "gujrat"
                ]):
                    detected_city = s.strip()
                    break

        # Fallback to default_city only if no explicit city found on card
        if not detected_city and default_city and default_city.lower() not in ["all", "pakistan", "all pakistan", ""]:
            detected_city = default_city.strip()

        city = detected_city.title() if detected_city else "Pakistan"

        # Variant
        brand_data = ld_data.get("brand", {}) if isinstance(ld_data.get("brand"), dict) else {}
        make = brand_data.get("name") or default_make or "Suzuki"
        model = default_model or "Alto"
        variant = extract_variant(title, make, model, year)

        # Date updated
        dated_el = item.select_one(".dated")
        updated_ago = dated_el.get_text(strip=True) if dated_el else "Recently"

        classes = item.get("class", [])
        is_featured = 1 if "featured-listing" in classes else 0
        is_managed = 1 if "managed-pw" in classes else 0

        return {
            "pakwheels_id": pw_id,
            "make": make.title(),
            "model": model.title(),
            "variant": variant or "Standard",
            "year": year or 2020,
            "price_pkr": price,
            "mileage_km": mileage or 0,
            "engine_cc": engine_cc or 660,
            "transmission": transmission,
            "fuel_type": fuel_type or "Petrol",
            "city": city or "Lahore",
            "location": city or "Lahore",
            "registered_city": city or "Lahore",
            "title": title,
            "url": url,
            "image_url": image_url or "",
            "updated_ago": updated_ago,
            "is_featured": is_featured,
            "is_managed_pw": is_managed
        }
    except Exception as e:
        logger.warning(f"Error parsing listing item: {e}")
        return None

def build_search_url(make_slug: str, model_slug: str, city_slug: Optional[str] = None, page: int = 1) -> str:
    """Builds PakWheels search URL with make, model, city, and page."""
    parts = []
    if make_slug and make_slug.lower() not in ["all", "all-makes", "all makes"]:
        parts.append(f"mk_{make_slug}")
    if model_slug and model_slug.lower() not in ["all", "all-models", "all models"]:
        parts.append(f"md_{model_slug}")
    if city_slug and city_slug.lower() not in ["all", "pakistan", "all pakistan", ""]:
        parts.append(f"ct_{city_slug}")

    query_path = "/".join(parts) + "/" if parts else ""
    base = f"https://www.pakwheels.com/used-cars/search/-/{query_path}"
    if page > 1:
        base += f"?page={page}"
    return base

async def fetch_page(client, url: str) -> Tuple[int, str, str]:
    """Fetches a single page with retries and detailed error reporting."""
    last_err = ""
    for attempt in range(2):
        try:
            resp = await client.get(url)
            if resp.status_code == 200:
                if "Just a moment..." in resp.text and ("challenge-platform" in resp.text or "cf-turnstile" in resp.text):
                    return 403, "", "Cloudflare anti-bot verification challenge triggered"
                return 200, resp.text, ""
            elif resp.status_code == 404:
                return 404, "", "Page not found (404)"
            else:
                last_err = f"PakWheels returned HTTP {resp.status_code}"
                if attempt == 0:
                    await asyncio.sleep(0.8)
                    continue
                return resp.status_code, "", last_err
        except Exception as e:
            last_err = str(e)
            if attempt == 1:
                logger.warning(f"Failed to fetch {url}: {e}")
            await asyncio.sleep(0.5)
    return 500, "", last_err or "Request timed out"

async def scrape_listings_generator(
    make_name: str,
    make_slug: str,
    model_name: str,
    model_slug: str,
    city_name: str,
    city_slug: str,
    scan_type: str = "all" # "all" (fetch all listings across all pages) or "quick" (3 pages preview)
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Streams scraping progress as an async generator:
    yields {"status": "progress", "current_page": n, "total_pages": N, "count": X, "percent": P}
    and finally {"status": "done", "total_scraped": total, "items": [...]}
    """
    first_url = build_search_url(make_slug, model_slug, city_slug, page=1)
    logger.info(f"Starting scrape: {first_url} (type: {scan_type})")

    yield {
        "status": "progress",
        "current_page": 1,
        "total_pages": 1,
        "count": 0,
        "percent": 5,
        "message": f"Connecting to PakWheels for {make_name} {model_name} in {city_name}..."
    }

    all_listings: List[Dict[str, Any]] = []

    if HAS_CURL_CFFI:
        client_ctx = AsyncSession(impersonate="chrome124", headers=HEADERS, timeout=18.0)
    else:
        client_ctx = httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=18.0)

    async with client_ctx as client:
        status, html, err = await fetch_page(client, first_url)
        if (status != 200 or not html) and HAS_CURL_CFFI:
            # Fallback to safari impersonation
            logger.info("Retrying with Safari impersonation...")
            try:
                async with AsyncSession(impersonate="safari17_0", headers=HEADERS, timeout=18.0) as safari_client:
                    s_stat, s_html, s_err = await fetch_page(safari_client, first_url)
                    if s_stat == 200 and s_html:
                        client = safari_client
                        status, html = s_stat, s_html
                    else:
                        err = s_err or err
            except Exception as se:
                logger.warning(f"Safari retry failed: {se}")

        if status != 200 or not html:
            yield {
                "status": "error",
                "message": f"Could not connect to PakWheels (HTTP {status}): {err or 'Connection restricted'}"
            }
            return

        soup = BeautifulSoup(html, "html.parser")
        items = soup.select(".classified-listing")

        # Parse page 1 listings
        for item in items:
            parsed = parse_listing_element(item, make_name, model_name, city_name)
            if parsed:
                all_listings.append(parsed)

        # Detect total pages
        last_link = soup.select_one(".pagination .last a")
        total_pages = 1
        if last_link and last_link.get("href"):
            m = re.search(r'page=(\d+)', last_link.get("href"))
            if m:
                total_pages = int(m.group(1))
        else:
            # Check pagination numbers
            page_numbers = [clean_int(a.get_text(strip=True)) for a in soup.select("ul.pagination a, .pagination li")]
            valid_nums = [n for n in page_numbers if n is not None]
            if valid_nums:
                total_pages = max(valid_nums)

        # Determine pages to scrape
        if scan_type == "quick":
            max_pages = min(total_pages, 3)
        else:
            # Fetch ALL available pages (up to 100 pages = 2,500 listings)
            max_pages = min(total_pages, 100)

        # Save page 1 listings to DB immediately
        if all_listings:
            upsert_listings(all_listings)

        pct = int((1 / max_pages) * 90) if max_pages > 0 else 90
        yield {
            "status": "progress",
            "current_page": 1,
            "total_pages": max_pages,
            "overall_total_pages": total_pages,
            "count": len(all_listings),
            "percent": max(pct, 5),
            "message": f"Fetched page 1 of {max_pages} ({len(all_listings)} listings saved)"
        }

        # If more pages exist, fetch with controlled concurrency
        if max_pages > 1:
            sem = asyncio.Semaphore(5)
            current_done = 1

            async def fetch_and_parse(p: int):
                nonlocal current_done
                async with sem:
                    p_url = build_search_url(make_slug, model_slug, city_slug, page=p)
                    p_stat, p_html, _ = await fetch_page(client, p_url)
                    p_listings = []
                    if p_stat == 200 and p_html:
                        p_soup = BeautifulSoup(p_html, "html.parser")
                        for it in p_soup.select(".classified-listing"):
                            parsed = parse_listing_element(it, make_name, model_name, city_name)
                            if parsed:
                                p_listings.append(parsed)
                    current_done += 1
                    return p_listings

            # Fetch remaining pages concurrently
            tasks = [fetch_and_parse(p) for p in range(2, max_pages + 1)]
            for completed_task in asyncio.as_completed(tasks):
                batch_listings = await completed_task
                if batch_listings:
                    all_listings.extend(batch_listings)
                    upsert_listings(batch_listings)

                percent = min(int((current_done / max_pages) * 95), 98)
                yield {
                    "status": "progress",
                    "current_page": current_done,
                    "total_pages": max_pages,
                    "overall_total_pages": total_pages,
                    "count": len(all_listings),
                    "percent": percent,
                    "message": f"Scraped page {current_done} of {max_pages} ({len(all_listings)} listings saved)"
                }

    # Record scan metadata in database
    try:
        record_scan_metadata(make_name, model_name, city_name, len(all_listings), scan_type)
    except Exception as e:
        logger.warning(f"Could not record scan metadata: {e}")

    yield {
        "status": "done",
        "current_page": max_pages,
        "total_pages": max_pages,
        "overall_total_pages": total_pages,
        "count": len(all_listings),
        "percent": 100,
        "message": f"Complete! {len(all_listings)} listings ready."
    }

