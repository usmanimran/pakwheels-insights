import io
import csv
import json
import logging
import asyncio
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, HTTPException, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from database.db import (
    init_db,
    get_catalog_hierarchy,
    query_listings,
    get_all_records_for_analytics,
    get_variants_for_model,
    get_last_scan_metadata,
    get_market_snapshots
)
from scraper.catalog import (
    scrape_full_catalog,
    ensure_catalog_seeded,
    POPULAR_CITIES,
    POPULAR_MAKES
)
from scraper.scraper import scrape_listings_generator
from analytics.engine import compute_market_analytics

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("pakwheels-api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    init_db()
    # Check if catalog has records, if not seed in background
    catalog = get_catalog_hierarchy()
    if not catalog:
        logger.info("Initializing car catalog from PakWheels sitemap...")
        asyncio.create_task(scrape_full_catalog())
    yield

app = FastAPI(title="PakWheels Market Intelligence API", lifespan=lifespan)

# Allow CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "PakWheels Market Intelligence"}

@app.get("/api/catalog")
def get_catalog():
    """Returns makes, models, and city options for filters."""
    hierarchy = get_catalog_hierarchy()
    
    # If hierarchy not yet ready, provide popular defaults
    makes_list = []
    if hierarchy:
        for make_name, data in hierarchy.items():
            makes_list.append({
                "make_name": make_name,
                "make_slug": data["make_slug"],
                "models_count": len(data["models"]),
                "models": data["models"]
            })
        # Sort so popular makes appear first
        makes_list.sort(key=lambda x: (x["make_name"] not in POPULAR_MAKES, x["make_name"]))
    else:
        # Fallback starter makes while background scrape completes
        for pm in POPULAR_MAKES:
            makes_list.append({
                "make_name": pm,
                "make_slug": pm.lower().replace(" ", "-"),
                "models_count": 0,
                "models": []
            })

    return {
        "makes": makes_list,
        "cities": POPULAR_CITIES,
        "popular_makes": POPULAR_MAKES
    }

from datetime import datetime

def format_time_ago(ts_str: Optional[str]) -> str:
    if not ts_str:
        return "Never"
    try:
        # SQLite CURRENT_TIMESTAMP format: YYYY-MM-DD HH:MM:SS
        dt = datetime.strptime(ts_str.split(".")[0], "%Y-%m-%d %H:%M:%S")
        diff = (datetime.utcnow() - dt).total_seconds()
        if diff < 60:
            return "Just now"
        elif diff < 3600:
            m = int(diff // 60)
            return f"{m} min ago" if m == 1 else f"{m} mins ago"
        elif diff < 86400:
            h = int(diff // 3600)
            return f"{h} hour ago" if h == 1 else f"{h} hours ago"
        else:
            d = int(diff // 86400)
            return f"{d} day ago" if d == 1 else f"{d} days ago"
    except Exception:
        return ts_str

@app.get("/api/scan-status")
def get_scan_status(
    make: str = Query("Suzuki"),
    model: str = Query("Alto"),
    cities: Optional[str] = Query(None),
    city: Optional[str] = Query(None)
):
    """Returns whether cached data exists, last scan timestamp, and total records."""
    target_city = cities or city
    meta = get_last_scan_metadata(make=make, model=model, cities=target_city)
    
    # Query current count in DB
    records = get_all_records_for_analytics(
        make=make,
        model=model,
        cities=cities,
        city=city
    )
    count = len(records)
    has_data = count > 0

    last_scraped_at = meta["last_scraped_at"] if meta else (records[0].get("scraped_at") if records else None)
    time_ago = format_time_ago(last_scraped_at) if last_scraped_at else "Not yet scanned"

    return {
        "has_cached_data": has_data,
        "count": count,
        "last_scraped_at": last_scraped_at,
        "time_ago": time_ago,
        "scan_type": meta["scan_type"] if meta else None
    }

@app.get("/api/snapshots")
def get_snapshots(
    make: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    cities: Optional[str] = Query(None)
):
    """Returns available historical market snapshots for make and model with dates, car counts, and stats."""
    clean_make = None if make and make.lower() in ["all", "all makes", "whole market"] else make
    clean_model = None if model and model.lower() in ["all", "all models"] else model
    snapshots = get_market_snapshots(make=clean_make, model=clean_model, cities=cities)
    return {"snapshots": snapshots}

@app.get("/api/variants")
def get_variants(
    make: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    cities: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    snapshot_id: Optional[str] = Query(None)
):
    """Returns distinct variants present in the database for the given make, model, cities, and optional snapshot."""
    variants = get_variants_for_model(make=make, model=model, cities=cities, city=city, snapshot_id=snapshot_id)
    return {"variants": variants}

@app.post("/api/catalog/sync")
async def sync_catalog():
    """Forces a sync of makes and models from PakWheels sitemap."""
    items = await scrape_full_catalog()
    return {"status": "synced", "count": len(items)}

@app.get("/api/scrape/stream")
async def stream_scrape(
    make_name: str = Query("Suzuki"),
    make_slug: str = Query("suzuki"),
    model_name: str = Query("Alto"),
    model_slug: str = Query("alto"),
    city_name: str = Query("Lahore"),
    city_slug: str = Query("lahore"),
    scan_type: str = Query("all") # "all" (fetch all listings) or "quick"
):
    """
    Server-Sent Events endpoint to stream live scraping progress directly to client.
    Supports comma-separated cities (e.g. lahore,karachi).
    """
    cities_slug_list = [c.strip() for c in city_slug.split(",") if c.strip()]
    cities_name_list = [c.strip() for c in city_name.split(",") if c.strip()]

    async def event_generator():
        try:
            total_cities = max(len(cities_slug_list), 1)
            for idx, c_slug in enumerate(cities_slug_list or [city_slug]):
                c_name = cities_name_list[idx] if idx < len(cities_name_list) else c_slug.capitalize()
                async for event in scrape_listings_generator(
                    make_name=make_name,
                    make_slug=make_slug,
                    model_name=model_name,
                    model_slug=model_slug,
                    city_name=c_name,
                    city_slug=c_slug,
                    scan_type=scan_type
                ):
                    # Annotate event with city index if multi-city
                    if total_cities > 1:
                        event["message"] = f"[{idx+1}/{total_cities} {c_name}] {event.get('message', '')}"
                    yield {
                        "event": "message",
                        "data": json.dumps(event)
                    }
        except Exception as e:
            logger.error(f"Error during scrape stream: {e}", exc_info=True)
            yield {
                "event": "message",
                "data": json.dumps({"status": "error", "message": str(e)})
            }

    return EventSourceResponse(event_generator())

@app.get("/api/listings")
def get_listings(
    make: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    cities: Optional[str] = Query(None),
    min_year: Optional[int] = Query(None),
    max_year: Optional[int] = Query(None),
    min_price: Optional[int] = Query(None),
    max_price: Optional[int] = Query(None),
    min_mileage: Optional[int] = Query(None),
    max_mileage: Optional[int] = Query(None),
    transmission: Optional[str] = Query(None),
    variant: Optional[str] = Query(None),
    sort_by: str = Query("newest"),
    limit: int = Query(30, ge=1, le=200),
    offset: int = Query(0, ge=0),
    snapshot_id: Optional[str] = Query(None)
):
    """Returns paginated listings according to filter, sort criteria, and optional historical snapshot."""
    result = query_listings(
        make=make,
        model=model,
        city=city,
        cities=cities,
        min_year=min_year,
        max_year=max_year,
        min_price=min_price,
        max_price=max_price,
        min_mileage=min_mileage,
        max_mileage=max_mileage,
        transmission=transmission,
        variant=variant,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
        snapshot_id=snapshot_id
    )
    return result

@app.get("/api/analytics")
def get_analytics(
    make: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    cities: Optional[str] = Query(None),
    min_year: Optional[int] = Query(None),
    max_year: Optional[int] = Query(None),
    min_price: Optional[int] = Query(None),
    max_price: Optional[int] = Query(None),
    transmission: Optional[str] = Query(None),
    variant: Optional[str] = Query(None),
    snapshot_id: Optional[str] = Query(None)
):
    """Calculates statistical metrics, price trends, and scatter coordinates for active or snapshot data."""
    records = get_all_records_for_analytics(
        make=make,
        model=model,
        city=city,
        cities=cities,
        min_year=min_year,
        max_year=max_year,
        min_price=min_price,
        max_price=max_price,
        transmission=transmission,
        variant=variant,
        snapshot_id=snapshot_id
    )
    analytics = compute_market_analytics(records)
    return analytics

def generate_segment_title(
    make: Optional[str],
    model: Optional[str],
    variant: Optional[str],
    cities: Optional[str],
    min_year: Optional[int],
    max_year: Optional[int]
) -> str:
    parts = []
    has_make = make and make.lower() not in ["all", "all makes", "whole market", ""]
    has_model = model and model.lower() not in ["all", "all models", ""]
    has_variant = variant and variant.lower() not in ["all", "all variants", ""]

    if has_make:
        if has_model:
            parts.append(f"{make} {model}")
            if has_variant:
                parts.append(f"({variant})")
        else:
            parts.append(f"All {make} Models")
    else:
        parts.append("Whole Market")

    if min_year and max_year:
        if min_year == max_year:
            parts.append(f"({min_year})")
        else:
            parts.append(f"({min_year}–{max_year})")
    elif min_year:
        parts.append(f"({min_year}+)")
    elif max_year:
        parts.append(f"(≤{max_year})")

    if cities and cities.lower() not in ["all", "all pakistan", ""]:
        parts.append(f"in {cities}")
    else:
        parts.append("in Pakistan")

    return " ".join(parts)

@app.get("/api/compare")
def compare_vehicles(
    make_a: Optional[str] = Query(None),
    model_a: Optional[str] = Query(None),
    variant_a: Optional[str] = Query(None),
    cities_a: Optional[str] = Query(None),
    min_year_a: Optional[int] = Query(None),
    max_year_a: Optional[int] = Query(None),
    
    make_b: Optional[str] = Query(None),
    model_b: Optional[str] = Query(None),
    variant_b: Optional[str] = Query(None),
    cities_b: Optional[str] = Query(None),
    min_year_b: Optional[int] = Query(None),
    max_year_b: Optional[int] = Query(None)
):
    """Calculates side-by-side comparative metrics for two market segments or cars."""
    clean_make_a = None if make_a and make_a.lower() in ["all", "all makes", "whole market"] else make_a
    clean_model_a = None if model_a and model_a.lower() in ["all", "all models"] else model_a
    clean_variant_a = None if variant_a and variant_a.lower() in ["all", "all variants"] else variant_a

    clean_make_b = None if make_b and make_b.lower() in ["all", "all makes", "whole market"] else make_b
    clean_model_b = None if model_b and model_b.lower() in ["all", "all models"] else model_b
    clean_variant_b = None if variant_b and variant_b.lower() in ["all", "all variants"] else variant_b

    records_a = get_all_records_for_analytics(
        make=clean_make_a,
        model=clean_model_a,
        variant=clean_variant_a,
        cities=cities_a,
        min_year=min_year_a,
        max_year=max_year_a
    )
    records_b = get_all_records_for_analytics(
        make=clean_make_b,
        model=clean_model_b,
        variant=clean_variant_b,
        cities=cities_b,
        min_year=min_year_b,
        max_year=max_year_b
    )

    analytics_a = compute_market_analytics(records_a)
    analytics_b = compute_market_analytics(records_b)

    # Compute year comparison overlay
    years_set = set(y["year"] for y in analytics_a["year_stats"]) | set(y["year"] for y in analytics_b["year_stats"])
    year_map_a = {y["year"]: y["avg_price_lacs"] for y in analytics_a["year_stats"]}
    year_map_b = {y["year"]: y["avg_price_lacs"] for y in analytics_b["year_stats"]}

    year_comparison = []
    for yr in sorted(years_set):
        year_comparison.append({
            "year": yr,
            "avg_price_a": year_map_a.get(yr, None),
            "avg_price_b": year_map_b.get(yr, None)
        })

    avg_a = analytics_a["avg_price"]
    avg_b = analytics_b["avg_price"]
    price_diff_pkr = avg_b - avg_a
    price_diff_pct = round(((avg_b - avg_a) / avg_a) * 100, 1) if avg_a > 0 else 0

    return {
        "car_a": {
            "title": generate_segment_title(make_a, model_a, variant_a, cities_a, min_year_a, max_year_a),
            "analytics": analytics_a
        },
        "car_b": {
            "title": generate_segment_title(make_b, model_b, variant_b, cities_b, min_year_b, max_year_b),
            "analytics": analytics_b
        },
        "comparison": {
            "price_diff_pkr": price_diff_pkr,
            "price_diff_lacs": round(price_diff_pkr / 100000, 2),
            "price_diff_pct": price_diff_pct,
            "mileage_diff_km": analytics_b["avg_mileage"] - analytics_a["avg_mileage"],
            "year_comparison": year_comparison
        }
    }

@app.get("/api/export")
def export_listings_csv(
    make: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    cities: Optional[str] = Query(None),
    min_year: Optional[int] = Query(None),
    max_year: Optional[int] = Query(None),
    min_price: Optional[int] = Query(None),
    max_price: Optional[int] = Query(None),
    transmission: Optional[str] = Query(None),
    variant: Optional[str] = Query(None),
    snapshot_id: Optional[str] = Query(None)
):
    """Exports filtered listings into CSV format."""
    records = get_all_records_for_analytics(
        make=make,
        model=model,
        city=city,
        cities=cities,
        min_year=min_year,
        max_year=max_year,
        min_price=min_price,
        max_price=max_price,
        transmission=transmission,
        variant=variant,
        snapshot_id=snapshot_id
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "PakWheels ID", "Make", "Model", "Variant", "Year",
        "Price (PKR)", "Price (Lacs)", "Mileage (km)", "Engine (cc)",
        "Transmission", "Fuel Type", "City", "Title", "URL", "Updated"
    ])

    for r in records:
        pr = r.get("price_pkr", 0)
        writer.writerow([
            r.get("pakwheels_id"),
            r.get("make"),
            r.get("model"),
            r.get("variant"),
            r.get("year"),
            pr,
            round(pr / 100000, 2) if pr else 0,
            r.get("mileage_km"),
            r.get("engine_cc"),
            r.get("transmission"),
            r.get("fuel_type"),
            r.get("city"),
            r.get("title"),
            r.get("url"),
            r.get("updated_ago")
        ])

    target_city = cities or city or 'all'
    filename = f"pakwheels_{make or 'cars'}_{model or 'all'}_{target_city}.csv".lower()
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

import os
from database.db import DB_PATH

@app.get("/api/db/export")
def export_database():
    """Exports the SQLite database file for backup or local inspection."""
    db_path = os.getenv("PAKWHEELS_DB_PATH", DB_PATH)
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Database file not found")
    return FileResponse(
        db_path,
        media_type="application/x-sqlite3",
        filename="pakwheels.db"
    )

@app.post("/api/db/import")
async def import_database(file: UploadFile = File(...)):
    """Uploads and syncs a SQLite database file into the active instance."""
    db_path = os.getenv("PAKWHEELS_DB_PATH", DB_PATH)
    temp_path = db_path + ".upload"
    try:
        content = await file.read()
        if len(content) < 100:
            raise HTTPException(status_code=400, detail="Uploaded file is too small or empty")
        if not content.startswith(b"SQLite format 3"):
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid SQLite database")
        with open(temp_path, "wb") as f:
            f.write(content)
        os.replace(temp_path, db_path)
        logger.info(f"Database successfully replaced from uploaded file ({len(content)} bytes)")
        return {"status": "ok", "message": f"Database updated ({len(content)} bytes)"}
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        logger.error(f"Error importing database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/debug/test-fetch")
async def debug_test_fetch(url: str = "https://www.pakwheels.com/used-cars/search/-/mk_suzuki/md_alto/ct_lahore/"):
    """Quick diagnostic endpoint to test server connectivity and Cloudflare response."""
    result = {"url": url}
    try:
        from curl_cffi.requests import AsyncSession
        async with AsyncSession(impersonate="chrome124", timeout=15) as s:
            r = await s.get(url)
            result["curl_cffi"] = {
                "status_code": r.status_code,
                "length": len(r.text),
                "is_cf_challenge": "Just a moment..." in r.text or "cf-turnstile" in r.text,
                "server": r.headers.get("server")
            }
    except Exception as e:
        result["curl_cffi"] = {"error": str(e)}

    try:
        import httpx
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as h:
            r2 = await h.get(url)
            result["httpx"] = {
                "status_code": r2.status_code,
                "length": len(r2.text),
                "server": r2.headers.get("server")
            }
    except Exception as e:
        result["httpx"] = {"error": str(e)}

    return result

class ProxyPayload(BaseModel):
    proxy: Optional[str] = None

@app.get("/api/settings/proxy")
def get_proxy_settings():
    """Returns current active proxy and its configuration source."""
    from database.db import get_setting
    from scraper.scraper import get_effective_proxy
    active = get_effective_proxy()
    saved = get_setting("scraper_proxy")
    return {
        "proxy": saved or "",
        "active_proxy": (active[:8] + "..." + active.split("@")[-1]) if active and "@" in active else (active or ""),
        "is_configured": bool(active),
        "source": "database" if saved else ("environment" if active else "none")
    }

@app.post("/api/settings/proxy")
def update_proxy_settings(payload: ProxyPayload):
    """Saves or clears the scraper proxy in application settings."""
    from database.db import set_setting
    p = (payload.proxy or "").strip()
    set_setting("scraper_proxy", p if p else None)
    return {"status": "ok", "message": "Proxy updated successfully" if p else "Proxy cleared"}

@app.post("/api/settings/proxy/test")
async def test_proxy_settings(payload: ProxyPayload):
    """Tests if a proxy can successfully connect to PakWheels without Cloudflare block."""
    from scraper.scraper import get_effective_proxy
    p = (payload.proxy or "").strip() or get_effective_proxy()
    if not p:
        raise HTTPException(status_code=400, detail="No proxy address provided to test")

    from curl_cffi.requests import AsyncSession
    try:
        async with AsyncSession(impersonate="chrome124", proxy=p, timeout=12.0) as s:
            r = await s.get("https://www.pakwheels.com/", timeout=12.0)
            if r.status_code == 200 and "pakwheels" in r.text.lower():
                return {"status": "ok", "message": f"Success! Proxy connected to PakWheels (HTTP {r.status_code})"}
            elif "Just a moment..." in r.text or "cf-turnstile" in r.text:
                return {"status": "error", "message": "Proxy reached PakWheels but was blocked by Cloudflare verification."}
            else:
                return {"status": "error", "message": f"PakWheels responded with HTTP {r.status_code}"}
    except Exception as e:
        return {"status": "error", "message": f"Connection failed: {str(e)}"}

DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not found")
        file_path = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend build not found")


