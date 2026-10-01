import statistics
from typing import List, Dict, Any, Optional

def format_pkr_lacs(pkr: float) -> str:
    """Formats numeric PKR into Pakistani Lacs or Crores."""
    if pkr >= 10000000:
        return f"{pkr / 10000000:.2f} Crore"
    elif pkr >= 100000:
        return f"{pkr / 100000:.2f} Lacs"
    return f"{pkr:,.0f} PKR"

def compute_market_analytics(listings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Computes comprehensive statistical insights and chart data from listings."""
    if not listings:
        return {
            "total_listings": 0,
            "avg_price": 0,
            "median_price": 0,
            "min_price": 0,
            "max_price": 0,
            "avg_mileage": 0,
            "formatted_avg_price": "0 PKR",
            "formatted_min_price": "0 PKR",
            "formatted_max_price": "0 PKR",
            "formatted_median_price": "0 PKR",
            "year_stats": [],
            "scatter_points": [],
            "variant_stats": [],
            "transmission_stats": [],
            "price_distribution": [],
            "deals": {"great": 0, "fair": 0, "high": 0}
        }

    prices = [l["price_pkr"] for l in listings if l.get("price_pkr")]
    mileages = [l["mileage_km"] for l in listings if l.get("mileage_km") is not None and l["mileage_km"] > 0]

    total_count = len(listings)
    avg_price = int(statistics.mean(prices)) if prices else 0
    median_price = int(statistics.median(prices)) if prices else 0
    min_price = min(prices) if prices else 0
    max_price = max(prices) if prices else 0
    avg_mileage = int(statistics.mean(mileages)) if mileages else 0

    # 1. Year-wise stats
    year_map: Dict[int, List[int]] = {}
    for l in listings:
        yr = l.get("year")
        pr = l.get("price_pkr")
        if yr and pr:
            year_map.setdefault(yr, []).append(pr)

    year_stats = []
    # Compute baseline average price by year for deal calculation
    year_avg_prices = {}
    for yr in sorted(year_map.keys()):
        y_prices = year_map[yr]
        y_avg = int(statistics.mean(y_prices))
        year_avg_prices[yr] = y_avg
        year_stats.append({
            "year": yr,
            "count": len(y_prices),
            "avg_price": y_avg,
            "min_price": min(y_prices),
            "max_price": max(y_prices),
            "avg_price_lacs": round(y_avg / 100000, 2),
            "min_price_lacs": round(min(y_prices) / 100000, 2),
            "max_price_lacs": round(max(y_prices) / 100000, 2),
        })

    # 2. Scatter Points & Deal Quality Rating
    scatter_points = []
    deal_counts = {"great": 0, "fair": 0, "high": 0}

    for l in listings:
        yr = l.get("year", 2020)
        pr = l.get("price_pkr", 0)
        km = l.get("mileage_km", 0)
        
        # Expected price baseline for that year
        baseline = year_avg_prices.get(yr, avg_price)
        # Mileage adjustment: ±0.5% price per 10k km away from 50k km
        mileage_factor = 1.0 - ((km - 50000) / 10000) * 0.005 if km else 1.0
        expected_price = baseline * mileage_factor

        diff_pct = (pr - expected_price) / expected_price if expected_price > 0 else 0
        
        if diff_pct < -0.08:
            rating = "Great Deal"
            deal_counts["great"] += 1
            color = "#10B981" # Green
        elif diff_pct > 0.08:
            rating = "Above Market"
            deal_counts["high"] += 1
            color = "#F59E0B" # Amber/Orange
        else:
            rating = "Fair Price"
            deal_counts["fair"] += 1
            color = "#3B82F6" # Blue

        scatter_points.append({
            "id": l.get("id"),
            "pakwheels_id": l.get("pakwheels_id"),
            "title": l.get("title", ""),
            "year": yr,
            "mileage": km,
            "price": pr,
            "price_lacs": round(pr / 100000, 2),
            "rating": rating,
            "color": color,
            "diff_pct": round(diff_pct * 100, 1),
            "url": l.get("url"),
            "image_url": l.get("image_url")
        })

    # 3. Variant Breakdown
    variant_map: Dict[str, List[int]] = {}
    for l in listings:
        v = (l.get("variant") or "Standard").strip()
        pr = l.get("price_pkr")
        if pr:
            variant_map.setdefault(v, []).append(pr)

    variant_stats = []
    for var_name, var_prices in sorted(variant_map.items(), key=lambda x: len(x[1]), reverse=True):
        if len(var_prices) >= 1:
            v_avg = int(statistics.mean(var_prices))
            variant_stats.append({
                "variant": var_name,
                "count": len(var_prices),
                "avg_price": v_avg,
                "avg_price_lacs": round(v_avg / 100000, 2),
                "percent_share": round((len(var_prices) / total_count) * 100, 1)
            })

    # 4. Transmission Stats
    trans_map: Dict[str, List[int]] = {}
    for l in listings:
        tr = (l.get("transmission") or "Unknown").capitalize()
        pr = l.get("price_pkr")
        if pr:
            trans_map.setdefault(tr, []).append(pr)

    transmission_stats = []
    for tr_name, tr_prices in trans_map.items():
        t_avg = int(statistics.mean(tr_prices))
        transmission_stats.append({
            "transmission": tr_name,
            "count": len(tr_prices),
            "avg_price": t_avg,
            "avg_price_lacs": round(t_avg / 100000, 2),
            "percent_share": round((len(tr_prices) / total_count) * 100, 1)
        })

    # 5. Price Distribution Histogram Bins
    # Dynamic brackets based on min and max price
    if max_price > min_price and total_count > 0:
        bin_count = 6
        step = (max_price - min_price) / bin_count
        price_distribution = []
        for i in range(bin_count):
            bin_start = min_price + (i * step)
            bin_end = bin_start + step
            b_count = sum(1 for p in prices if (bin_start <= p < bin_end or (i == bin_count - 1 and p <= bin_end)))
            label = f"{round(bin_start / 100000, 1)}-{round(bin_end / 100000, 1)} Lacs"
            price_distribution.append({
                "range": label,
                "min": int(bin_start),
                "max": int(bin_end),
                "count": b_count
            })
    else:
        price_distribution = []

    return {
        "total_listings": total_count,
        "avg_price": avg_price,
        "median_price": median_price,
        "min_price": min_price,
        "max_price": max_price,
        "avg_mileage": avg_mileage,
        "formatted_avg_price": format_pkr_lacs(avg_price),
        "formatted_min_price": format_pkr_lacs(min_price),
        "formatted_max_price": format_pkr_lacs(max_price),
        "formatted_median_price": format_pkr_lacs(median_price),
        "year_stats": year_stats,
        "scatter_points": scatter_points[:300], # Send up to 300 for clean responsive charts
        "variant_stats": variant_stats[:10],
        "transmission_stats": transmission_stats,
        "price_distribution": price_distribution,
        "deals": deal_counts
    }
