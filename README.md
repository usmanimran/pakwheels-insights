# PakWheels Market Intelligence & Data Visualization Platform

A full-stack web application to scrape, store, analyze, and visualize used car listings across **all 88 vehicle manufacturers and 690+ models** on [PakWheels](https://www.pakwheels.com).

Provides live pricing statistics, distribution curves, depreciation and deal-finder scatter plots, and multi-metric filtering (Year, Price, Mileage, Transmission, Variant) to help buyers and sellers make informed automotive decisions in Pakistan.

---

## Key Features

- **Universal Vehicle Catalog:**
  - Scrapes and syncs the entire PakWheels taxonomy: **88 vehicle makes** (Suzuki, Toyota, Honda, KIA, Hyundai, Changan, MG, Haval, etc.) and **690+ models** directly from PakWheels sitemap.
  - Cascading make/model selector with quick presets for popular Pakistani cars.
  - Target city filtering (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, or Nationwide).

- **Dual-Mode Live Scraper:**
  - **Quick Scan (~3 seconds):** Rapidly fetches recent pages (~75–100 listings) for instant analysis.
  - **Deep Market Scrape:** Concurrently crawls all available pages up to 1,000+ listings.
  - **Real-Time Progress Streaming:** Server-Sent Events (SSE) stream page-by-page progress bars and listing counts directly into the web UI.

- **High-Fidelity Data Extraction:**
  - Direct Schema.org JSON-LD extraction (`offers.price`, `modelDate`, `mileageFromOdometer`, `vehicleTransmission`, `engineDisplacement`, `image`, `url`).
  - Supplemented with HTML card parsing for trim/variant identification (e.g. `VXL AGS`, `Altis Grande`), badges (`Managed by PakWheels`, `Featured`), and update timestamps.

- **Market Intelligence & Statistical Analytics:**
  - **Top KPI Metric Cards:** Total Active Listings, Average Market Price (formatted in PKR Lacs/Crore), Lowest Entry Price, Highest Price, Median Price, and Average Mileage.
  - **Price by Model Year:** Bar chart displaying average price trajectory across years with min/max price bounds.
  - **Deal Quality Indicator (Scatter Plot):** Price vs. Mileage plane where every dot represents a vehicle. Identifies underpriced market deals (>8% below market trend) with interactive hover cards and direct links to PakWheels ads.
  - **Variant & Trim Distribution:** Donut charts and volume/price breakdowns for trims (e.g., VXL AGS vs. VXR vs. VX).
  - **Price Bracket Histogram:** Frequency distribution across market price brackets.

- **Advanced Filtering & Export:**
  - Interactive sliders for Year range, Price range (PKR Lacs), Max Mileage, and Transmission pills.
  - Sort by Lowest Price, Highest Price, Newest Year, Oldest Year, or Lowest Mileage.
  - Dual view modes: Grid Cards view and Spreadsheet Table view.
  - One-click CSV Export with formatted prices, specs, and URLs.

---

## Architecture & Technology Stack

```
Pakwheels/
├── backend/                  # FastAPI Python backend
│   ├── main.py               # REST API & SSE streaming endpoints
│   ├── pakwheels.db          # SQLite database (WAL mode, indexed)
│   ├── database/
│   │   ├── db.py             # Schema, migrations, queries, and upserts
│   │   └── models.py
│   ├── scraper/
│   │   ├── catalog.py        # 88-make & 690-model taxonomy extractor
│   │   └── scraper.py        # Asynchronous pooled listing crawler
│   ├── analytics/
│   │   └── engine.py         # Statistical analysis, KPIs, & regression deal scoring
│   └── tests/                # Automated unit tests
├── frontend/                 # React 18 Single Page Application
│   ├── src/
│   │   ├── components/       # SearchBar, Navbar, KpiCards, Charts, Filters, Cards
│   │   ├── services/api.js   # API client and SSE streaming
│   │   └── App.jsx           # Main reactive dashboard
│   ├── tailwind.config.js    # Custom styling with PakWheels theme palette
│   └── vite.config.js        # Vite dev server with proxy to backend
└── start.sh                  # One-click startup script
```

---

## Quick Start

### 1. Launch Everything with One Command:
```bash
./start.sh
```
This automatically boots:
- **FastAPI Backend Server:** `http://127.0.0.1:8000` (API Docs at `/docs`)
- **React Frontend UI:** `http://localhost:5173`

### 2. Manual Launch (Optional):

#### Backend:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend:
```bash
cd frontend
npm run dev
```

---

## Running Automated Tests

Run backend tests using Python's `unittest`:
```bash
backend/venv/bin/python -m unittest discover -s backend/tests -p "test_*.py"
```
Verifies:
- Search URL generation for makes, models, and cities.
- Schema.org JSON-LD parsing & variant extraction.
- Statistical KPI calculations (mean, median, min, max, yearly aggregates).
- Deal Quality classification logic.
