import sqlite3
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "pakwheels.db")

def get_connection() -> sqlite3.Connection:
    db_path = os.getenv("PAKWHEELS_DB_PATH", DB_PATH)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    if not db_path.startswith(":memory:"):
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Table for car catalog (makes and models)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS car_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        make_name TEXT NOT NULL,
        make_slug TEXT NOT NULL,
        model_name TEXT NOT NULL,
        model_slug TEXT NOT NULL,
        pakwheels_id TEXT,
        category TEXT,
        UNIQUE(make_slug, model_slug)
    );
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_catalog_make_slug ON car_catalog(make_slug);
    """)

    # Table for listings
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pakwheels_id INTEGER UNIQUE NOT NULL,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        variant TEXT,
        year INTEGER,
        price_pkr INTEGER NOT NULL,
        mileage_km INTEGER,
        engine_cc INTEGER,
        transmission TEXT,
        fuel_type TEXT,
        city TEXT,
        location TEXT,
        registered_city TEXT,
        title TEXT,
        url TEXT,
        image_url TEXT,
        updated_ago TEXT,
        is_featured INTEGER DEFAULT 0,
        is_managed_pw INTEGER DEFAULT 0,
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_listings_search ON listings(make, model, city);
    """)
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_listings_year ON listings(year);
    """)
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price_pkr);
    """)

    # Table for scan metadata / cache tracking
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scan_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        cities TEXT NOT NULL,
        last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_listings INTEGER DEFAULT 0,
        scan_type TEXT,
        UNIQUE(make, model, cities)
    );
    """)

    # Table for scrape jobs / tracking
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scrape_jobs (
        id TEXT PRIMARY KEY,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        city TEXT,
        scan_type TEXT,
        status TEXT,
        total_pages INTEGER DEFAULT 0,
        current_page INTEGER DEFAULT 0,
        listings_count INTEGER DEFAULT 0,
        message TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    );
    """)

    conn.commit()
    conn.close()

def record_scan_metadata(make: str, model: str, cities: str, count: int, scan_type: str = "all"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO scan_metadata (make, model, cities, last_scraped_at, total_listings, scan_type)
    VALUES (:make, :model, :cities, CURRENT_TIMESTAMP, :count, :scan_type)
    ON CONFLICT(make, model, cities) DO UPDATE SET
        last_scraped_at=CURRENT_TIMESTAMP,
        total_listings=:count,
        scan_type=:scan_type;
    """, {"make": make, "model": model, "cities": cities, "count": count, "scan_type": scan_type})
    conn.commit()
    conn.close()

def get_last_scan_metadata(make: str, model: str, cities: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    row = None
    if cities:
        row = cursor.execute("""
        SELECT * FROM scan_metadata
        WHERE LOWER(make) = LOWER(:make) AND LOWER(model) = LOWER(:model) AND LOWER(cities) = LOWER(:cities)
        ORDER BY last_scraped_at DESC LIMIT 1
        """, {"make": make, "model": model, "cities": cities}).fetchone()
        
    if not row:
        row = cursor.execute("""
        SELECT * FROM scan_metadata
        WHERE LOWER(make) = LOWER(:make) AND LOWER(model) = LOWER(:model)
        ORDER BY last_scraped_at DESC LIMIT 1
        """, {"make": make, "model": model}).fetchone()

    # Fallback to listings table if scan_metadata hasn't recorded this yet
    if not row:
        clean_cities = parse_target_cities(cities)
        city_cond = ""
        params = {"make": make, "model": model}
        if clean_cities:
            placeholders = [f":c_{i}" for i in range(len(clean_cities))]
            city_cond = f"AND LOWER(city) IN ({', '.join(placeholders)})"
            for i, c in enumerate(clean_cities):
                params[f"c_{i}"] = c
        fb_row = cursor.execute(f"""
        SELECT MAX(scraped_at) as last_scraped_at, COUNT(*) as total_listings
        FROM listings
        WHERE LOWER(make) = LOWER(:make) AND LOWER(model) = LOWER(:model) {city_cond}
        """, params).fetchone()
        if fb_row and fb_row["last_scraped_at"]:
            row = {
                "make": make,
                "model": model,
                "cities": cities or "All",
                "last_scraped_at": fb_row["last_scraped_at"],
                "total_listings": fb_row["total_listings"],
                "scan_type": "all"
            }

    conn.close()
    return dict(row) if row else None


def save_car_catalog(catalog_items: List[Dict[str, Any]]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executemany("""
    INSERT INTO car_catalog (make_name, make_slug, model_name, model_slug, pakwheels_id, category)
    VALUES (:make_name, :make_slug, :model_name, :model_slug, :pakwheels_id, :category)
    ON CONFLICT(make_slug, model_slug) DO UPDATE SET
        make_name=excluded.make_name,
        model_name=excluded.model_name,
        pakwheels_id=excluded.pakwheels_id,
        category=excluded.category;
    """, catalog_items)
    conn.commit()
    conn.close()

def get_catalog_hierarchy() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("""
    SELECT make_name, make_slug, model_name, model_slug, pakwheels_id
    FROM car_catalog
    ORDER BY make_name ASC, model_name ASC
    """).fetchall()
    conn.close()

    result = {}
    for r in rows:
        make_name = r["make_name"]
        make_slug = r["make_slug"]
        if make_name not in result:
            result[make_name] = {
                "make_name": make_name,
                "make_slug": make_slug,
                "models": []
            }
        result[make_name]["models"].append({
            "model_name": r["model_name"],
            "model_slug": r["model_slug"],
            "pakwheels_id": r["pakwheels_id"]
        })
    return result

def upsert_listings(listings_data: List[Dict[str, Any]]):
    if not listings_data:
        return
    cleaned_data = []
    for item in listings_data:
        cleaned_data.append({
            "pakwheels_id": item.get("pakwheels_id"),
            "make": item.get("make", ""),
            "model": item.get("model", ""),
            "variant": item.get("variant", "Standard"),
            "year": item.get("year", 2020),
            "price_pkr": item.get("price_pkr", 0),
            "mileage_km": item.get("mileage_km", 0),
            "engine_cc": item.get("engine_cc", 660),
            "transmission": item.get("transmission", "Manual"),
            "fuel_type": item.get("fuel_type", "Petrol"),
            "city": item.get("city", "Pakistan"),
            "location": item.get("location", ""),
            "registered_city": item.get("registered_city", ""),
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "image_url": item.get("image_url", ""),
            "updated_ago": item.get("updated_ago", "Recently"),
            "is_featured": item.get("is_featured", 0),
            "is_managed_pw": item.get("is_managed_pw", 0),
        })
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executemany("""
    INSERT INTO listings (
        pakwheels_id, make, model, variant, year, price_pkr, mileage_km,
        engine_cc, transmission, fuel_type, city, location, registered_city,
        title, url, image_url, updated_ago, is_featured, is_managed_pw, scraped_at
    ) VALUES (
        :pakwheels_id, :make, :model, :variant, :year, :price_pkr, :mileage_km,
        :engine_cc, :transmission, :fuel_type, :city, :location, :registered_city,
        :title, :url, :image_url, :updated_ago, :is_featured, :is_managed_pw, CURRENT_TIMESTAMP
    )
    ON CONFLICT(pakwheels_id) DO UPDATE SET
        price_pkr=excluded.price_pkr,
        mileage_km=excluded.mileage_km,
        variant=excluded.variant,
        transmission=excluded.transmission,
        fuel_type=excluded.fuel_type,
        city=excluded.city,
        updated_ago=excluded.updated_ago,
        image_url=excluded.image_url,
        scraped_at=CURRENT_TIMESTAMP;
    """, cleaned_data)
    conn.commit()
    conn.close()

def parse_target_cities(cities: Optional[Any] = None, city: Optional[str] = None) -> List[str]:
    target = []
    if cities:
        if isinstance(cities, str):
            target = [c.strip() for c in cities.split(",") if c.strip()]
        elif isinstance(cities, (list, tuple, set)):
            target = [str(c).strip() for c in cities if str(c).strip()]
    elif city:
        target = [c.strip() for c in city.split(",") if c.strip()]
    return [c.lower() for c in target if c.lower() not in ["all", "pakistan", "all pakistan", ""]]

def get_variants_for_model(
    make: Optional[str] = None,
    model: Optional[str] = None,
    cities: Optional[Any] = None,
    city: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    conditions = []
    params = {}
    if make:
        conditions.append("LOWER(make) = LOWER(:make)")
        params["make"] = make
    if model and model.lower() not in ["all", "all models", ""]:
        conditions.append("LOWER(model) = LOWER(:model)")
        params["model"] = model

    clean_cities = parse_target_cities(cities, city)
    if clean_cities:
        placeholders = [f":city_{i}" for i in range(len(clean_cities))]
        conditions.append(f"LOWER(city) IN ({', '.join(placeholders)})")
        for i, c in enumerate(clean_cities):
            params[f"city_{i}"] = c

    # SQA price bounds
    conditions.append("price_pkr >= 100000 AND price_pkr <= 500000000")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
    SELECT variant, COUNT(*) as count, AVG(price_pkr) as avg_price
    FROM listings
    {where_clause}
    GROUP BY variant
    HAVING variant IS NOT NULL AND variant != ''
    ORDER BY count DESC
    """
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def query_listings(
    make: Optional[str] = None,
    model: Optional[str] = None,
    city: Optional[str] = None,
    cities: Optional[Any] = None,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_mileage: Optional[int] = None,
    max_mileage: Optional[int] = None,
    transmission: Optional[str] = None,
    variant: Optional[str] = None,
    sort_by: str = "newest",
    limit: int = 50,
    offset: int = 0
) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()

    conditions = []
    params = {}

    if make and make.lower() not in ["all", "all makes", "whole market", ""]:
        conditions.append("LOWER(make) = LOWER(:make)")
        params["make"] = make
    if model and model.lower() not in ["all", "all models", ""]:
        conditions.append("LOWER(model) = LOWER(:model)")
        params["model"] = model

    clean_cities = parse_target_cities(cities, city)
    if clean_cities:
        placeholders = [f":city_{i}" for i in range(len(clean_cities))]
        conditions.append(f"LOWER(city) IN ({', '.join(placeholders)})")
        for i, c in enumerate(clean_cities):
            params[f"city_{i}"] = c

    if min_year:
        conditions.append("year >= :min_year")
        params["min_year"] = min_year
    if max_year:
        conditions.append("year <= :max_year")
        params["max_year"] = max_year
    if min_price:
        conditions.append("price_pkr >= :min_price")
        params["min_price"] = min_price
    if max_price:
        conditions.append("price_pkr <= :max_price")
        params["max_price"] = max_price
    if min_mileage is not None:
        conditions.append("mileage_km >= :min_mileage")
        params["min_mileage"] = min_mileage
    if max_mileage is not None:
        conditions.append("mileage_km <= :max_mileage")
        params["max_mileage"] = max_mileage
    if transmission and transmission.lower() != "all":
        conditions.append("LOWER(transmission) = LOWER(:transmission)")
        params["transmission"] = transmission
    if variant and variant.lower() not in ["all", "all variants", ""]:
        v_list = [v.strip().lower() for v in variant.split(",") if v.strip()]
        if len(v_list) == 1:
            conditions.append("(LOWER(variant) = :variant OR LOWER(variant) LIKE :variant_like)")
            params["variant"] = v_list[0]
            params["variant_like"] = f"%{v_list[0]}%"
        elif len(v_list) > 1:
            or_parts = []
            for idx, v in enumerate(v_list):
                p_name = f"var_{idx}"
                p_like = f"var_like_{idx}"
                or_parts.append(f"(LOWER(variant) = :{p_name} OR LOWER(variant) LIKE :{p_like})")
                params[p_name] = v
                params[p_like] = f"%{v}%"
            conditions.append(f"({' OR '.join(or_parts)})")

    # SQA price bounds
    conditions.append("price_pkr >= 100000 AND price_pkr <= 500000000")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # Count total matching
    count_query = f"SELECT COUNT(*) as total FROM listings {where_clause}"
    cursor.execute(count_query, params)
    total_count = cursor.fetchone()["total"]

    # Sorting
    order_clause = "ORDER BY year DESC, id DESC"
    if sort_by == "price_asc":
        order_clause = "ORDER BY price_pkr ASC"
    elif sort_by == "price_desc":
        order_clause = "ORDER BY price_pkr DESC"
    elif sort_by == "year_desc":
        order_clause = "ORDER BY year DESC, price_pkr ASC"
    elif sort_by == "year_asc":
        order_clause = "ORDER BY year ASC, price_pkr ASC"
    elif sort_by == "mileage_asc":
        order_clause = "ORDER BY mileage_km ASC"
    elif sort_by == "mileage_desc":
        order_clause = "ORDER BY mileage_km DESC"
    elif sort_by == "newest":
        order_clause = "ORDER BY id DESC"

    data_query = f"""
    SELECT * FROM listings {where_clause}
    {order_clause}
    LIMIT :limit OFFSET :offset
    """
    params["limit"] = limit
    params["offset"] = offset

    cursor.execute(data_query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "items": rows
    }

def get_all_records_for_analytics(
    make: Optional[str] = None,
    model: Optional[str] = None,
    city: Optional[str] = None,
    cities: Optional[Any] = None,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    transmission: Optional[str] = None,
    variant: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()

    conditions = []
    params = {}
    if make and make.lower() not in ["all", "all makes", "whole market", ""]:
        conditions.append("LOWER(make) = LOWER(:make)")
        params["make"] = make
    if model and model.lower() not in ["all", "all models", ""]:
        conditions.append("LOWER(model) = LOWER(:model)")
        params["model"] = model

    clean_cities = parse_target_cities(cities, city)
    if clean_cities:
        placeholders = [f":city_{i}" for i in range(len(clean_cities))]
        conditions.append(f"LOWER(city) IN ({', '.join(placeholders)})")
        for i, c in enumerate(clean_cities):
            params[f"city_{i}"] = c

    if min_year:
        conditions.append("year >= :min_year")
        params["min_year"] = min_year
    if max_year:
        conditions.append("year <= :max_year")
        params["max_year"] = max_year
    if min_price:
        conditions.append("price_pkr >= :min_price")
        params["min_price"] = min_price
    if max_price:
        conditions.append("price_pkr <= :max_price")
        params["max_price"] = max_price
    if transmission and transmission.lower() != "all":
        conditions.append("LOWER(transmission) = LOWER(:transmission)")
        params["transmission"] = transmission
    if variant and variant.lower() not in ["all", "all variants", ""]:
        v_list = [v.strip().lower() for v in variant.split(",") if v.strip()]
        if len(v_list) == 1:
            conditions.append("(LOWER(variant) = :variant OR LOWER(variant) LIKE :variant_like)")
            params["variant"] = v_list[0]
            params["variant_like"] = f"%{v_list[0]}%"
        elif len(v_list) > 1:
            or_parts = []
            for idx, v in enumerate(v_list):
                p_name = f"var_{idx}"
                p_like = f"var_like_{idx}"
                or_parts.append(f"(LOWER(variant) = :{p_name} OR LOWER(variant) LIKE :{p_like})")
                params[p_name] = v
                params[p_like] = f"%{v}%"
            conditions.append(f"({' OR '.join(or_parts)})")

    # SQA price bounds
    conditions.append("price_pkr >= 100000 AND price_pkr <= 500000000")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
    SELECT id, pakwheels_id, make, model, variant, year, price_pkr, mileage_km,
           engine_cc, transmission, fuel_type, city, title, url, image_url, updated_ago, scraped_at
    FROM listings {where_clause}
    """
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

