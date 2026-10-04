import React, { useState, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  PieChart,
  Pie,
  Brush
} from 'recharts';
import {
  TrendingUp, ScatterChart as ScatterIcon, Layers, PieChart as PieIcon,
  BarChart2, ExternalLink, ZoomIn, ZoomOut, RotateCcw, Calendar, Check,
  Award, Sparkles, HelpCircle, Info, X, ChevronLeft, ChevronRight
} from 'lucide-react';

// Custom Tooltip for Price vs Model Year
const YearTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 dark:bg-[#0D2342]/95 border border-slate-200 dark:border-[#1C3B66] p-2.5 sm:p-3 rounded-xl shadow-2xl text-xs space-y-1 backdrop-blur-md">
        <p className="font-black text-slate-900 dark:text-white text-xs sm:text-sm mb-0.5">{label} Model</p>
        <p className="text-slate-600 dark:text-slate-300">
          Average: <strong className="text-sky-600 dark:text-sky-400 font-bold">{data.avg_price_lacs} Lacs</strong>
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
          Range: {data.min_price_lacs} - {data.max_price_lacs} Lacs
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
          Inventory: <span className="text-slate-900 dark:text-white font-bold">{data.count} cars</span>
        </p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Scatter Plot
const ScatterTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.isTrend) {
      return (
        <div className="bg-white/95 dark:bg-[#0D2342]/95 border border-emerald-500/40 p-2.5 rounded-xl shadow-xl text-xs space-y-0.5 backdrop-blur-md">
          <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px]">
            <span className="w-2.5 h-0.5 bg-emerald-500 rounded-full" />
            <span>Fair Value Regression Baseline</span>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-300">
            Expected: <strong>{data.price_lacs} Lacs</strong> at <strong>{data.mileage?.toLocaleString()} km</strong>
          </p>
          <p className="text-[9px] text-slate-400">Cars below this dashed line are undervalued deals.</p>
        </div>
      );
    }
    return (
      <div
        onClick={() => data.url && window.open(data.url, '_blank')}
        className="bg-white/98 dark:bg-[#0D2342]/98 border border-slate-300 dark:border-[#1C3B66] p-3 rounded-xl shadow-2xl text-xs space-y-1.5 max-w-xs backdrop-blur-md cursor-pointer hover:border-[#C8232C] dark:hover:border-[#C8232C] transition-all group"
      >
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="font-extrabold text-slate-900 dark:text-white truncate text-xs group-hover:text-[#C8232C] transition-colors">
            {data.title || `${data.year} Model`}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex-shrink-0 ${
              data.rating === 'Great Deal'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : data.rating === 'Above Market'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                : 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30'
            }`}
          >
            {data.rating}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
            PKR {data.price_lacs} Lacs
          </p>
          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-normal">
            ({data.price?.toLocaleString()} PKR)
          </span>
        </div>
        <div className="text-slate-600 dark:text-slate-300 flex items-center justify-between text-[10px] pt-1 border-t border-slate-200 dark:border-[#1A3B6B]">
          <span>Year: <strong className="text-slate-900 dark:text-white">{data.year}</strong></span>
          <span>Mileage: <strong className="text-slate-900 dark:text-white">{data.mileage?.toLocaleString()} km</strong></span>
        </div>
        {data.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-[#C8232C] hover:bg-[#A81B23] text-white font-bold text-[10px] flex items-center justify-center space-x-1.5 shadow transition"
          >
            <span>View Ad on PakWheels</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }
  return null;
};

const PIE_COLORS = ['#C8232C', '#1D70B8', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#E11D48'];

export default function ChartsDashboard({ analytics, loading, theme = 'dark' }) {
  const [activeTab, setActiveTab] = useState('year'); // 'year', 'scatter', 'variants', 'distribution'
  const [eraFilter, setEraFilter] = useState('all'); // 'all', '2020+', '2015-19', 'pre2015'

  // Deal Finder Rating Filter: 'all', 'great', 'fair', 'above'
  const [dealRatingFilter, setDealRatingFilter] = useState('all');
  // Mobile sub-view: 'chart' or 'top_deals'
  const [scatterSubView, setScatterSubView] = useState('chart');
  const [showFairValueModal, setShowFairValueModal] = useState(false);

  // Horizontal Mileage Zoom & Pan State (Y-axis Price is permanently locked to full range)
  const [zoomFactor, setZoomFactor] = useState(1);
  const [mileageMin, setMileageMin] = useState(0);
  const [mileageMax, setMileageMax] = useState(null);
  const [selectedMileagePreset, setSelectedMileagePreset] = useState('all');
  const [activeScatterPoint, setActiveScatterPoint] = useState(null);

  // Compute filtered year stats for mobile era filter
  const filteredYearStats = useMemo(() => {
    if (!analytics?.year_stats) return [];
    if (eraFilter === '2020+') return analytics.year_stats.filter((y) => y.year >= 2020);
    if (eraFilter === '2015-19') return analytics.year_stats.filter((y) => y.year >= 2015 && y.year <= 2019);
    if (eraFilter === 'pre2015') return analytics.year_stats.filter((y) => y.year < 2015);
    return analytics.year_stats;
  }, [analytics?.year_stats, eraFilter]);

  // Compute natural dynamic ranges for scatter plot so dots fill the full chart height
  const allScatterPoints = useMemo(() => analytics?.scatter_points || [], [analytics?.scatter_points]);

  const rawPrices = useMemo(() => {
    return allScatterPoints.map((p) => p.price_lacs).filter((p) => p > 0);
  }, [allScatterPoints]);

  const rawMileages = useMemo(() => {
    return allScatterPoints.map((p) => p.mileage).filter((m) => m > 0);
  }, [allScatterPoints]);

  // Smart 98th percentile to prevent extreme single outliers (e.g. 643,000 km) from squishing 98% of cars into 20% width
  const p98Mileage = useMemo(() => {
    if (!rawMileages.length) return 150000;
    const sorted = [...rawMileages].sort((a, b) => a - b);
    const idx = Math.min(Math.floor(sorted.length * 0.98), sorted.length - 1);
    return Math.max(sorted[idx], 100000);
  }, [rawMileages]);

  const fullMaxMileage = useMemo(() => {
    return Math.ceil(p98Mileage * 1.12);
  }, [p98Mileage]);

  const p98Price = useMemo(() => {
    if (!rawPrices.length) return 50;
    const sorted = [...rawPrices].sort((a, b) => a - b);
    const idx = Math.min(Math.floor(sorted.length * 0.98), sorted.length - 1);
    return Math.max(sorted[idx], 15);
  }, [rawPrices]);

  // Price Domain: PERMANENTLY FIXED to full price range. Never zooms vertically!
  const dynamicPriceDomain = useMemo(() => {
    if (!rawPrices.length) return [0, 50];
    const min = Math.min(...rawPrices);
    const padMin = Math.max(0, Math.floor(min * 0.85));
    const padMax = Math.ceil(p98Price * 1.15);
    return [padMin, padMax];
  }, [rawPrices, p98Price]);

  // Mileage Domain: Horizontal-only zoom and pan
  const dynamicMileageDomain = useMemo(() => {
    const effectiveMax = mileageMax || fullMaxMileage;
    return [mileageMin, effectiveMax];
  }, [mileageMin, mileageMax, fullMaxMileage]);

  // Compute linear regression Fair Value Trendline (Price vs Mileage) across visible range
  const fairValueTrendData = useMemo(() => {
    const minX = dynamicMileageDomain[0];
    const maxX = dynamicMileageDomain[1];
    const validPoints = allScatterPoints.filter(
      (p) => p.mileage > 0 && p.price_lacs > 0
    );
    if (validPoints.length < 3) return [];

    const n = validPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const p of validPoints) {
      sumX += p.mileage;
      sumY += p.price_lacs;
      sumXY += p.mileage * p.price_lacs;
      sumXX += p.mileage * p.mileage;
    }
    const denom = (n * sumXX - sumX * sumX);
    if (denom === 0) return [];
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    const yAtMin = Math.max(0.5, Number((intercept + slope * minX).toFixed(2)));
    const yAtMax = Math.max(0.5, Number((intercept + slope * maxX).toFixed(2)));

    return [
      { mileage: minX, price_lacs: yAtMin, isTrend: true },
      { mileage: maxX, price_lacs: yAtMax, isTrend: true }
    ];
  }, [allScatterPoints, dynamicMileageDomain]);

  // Filter scatter points by rating filter and horizontal mileage window
  const displayedScatterPoints = useMemo(() => {
    const minM = dynamicMileageDomain[0];
    const maxM = dynamicMileageDomain[1];
    return allScatterPoints.filter((p) => {
      if (dealRatingFilter === 'great' && p.rating !== 'Great Deal') return false;
      if (dealRatingFilter === 'fair' && p.rating !== 'Fair Price') return false;
      if (dealRatingFilter === 'above' && p.rating !== 'Above Market') return false;
      if (p.mileage < minM || p.mileage > maxM) return false;
      return true;
    });
  }, [allScatterPoints, dealRatingFilter, dynamicMileageDomain]);

  // Count by rating for quick pills
  const ratingCounts = useMemo(() => {
    const counts = { all: allScatterPoints.length, great: 0, fair: 0, above: 0 };
    for (const p of allScatterPoints) {
      if (p.rating === 'Great Deal') counts.great++;
      else if (p.rating === 'Fair Price') counts.fair++;
      else if (p.rating === 'Above Market') counts.above++;
    }
    return counts;
  }, [allScatterPoints]);

  // Top Deals Ranked List (Best bargains for mobile users)
  const topDealsList = useMemo(() => {
    const avgPrice = analytics?.avg_price_lacs || 0;
    return [...allScatterPoints]
      .filter((p) => p.rating === 'Great Deal' || (avgPrice > 0 && p.price_lacs < avgPrice))
      .sort((a, b) => {
        if (a.rating === 'Great Deal' && b.rating !== 'Great Deal') return -1;
        if (b.rating === 'Great Deal' && a.rating !== 'Great Deal') return 1;
        return a.price_lacs - b.price_lacs;
      })
      .slice(0, 10);
  }, [allScatterPoints, analytics?.avg_price_lacs]);

  // Set default active point to the best deal if none selected
  const currentInspectPoint = useMemo(() => {
    if (activeScatterPoint) return activeScatterPoint;
    if (displayedScatterPoints.length > 0) {
      const deal = displayedScatterPoints.find((p) => p.rating === 'Great Deal');
      return deal || displayedScatterPoints[0];
    }
    return null;
  }, [activeScatterPoint, displayedScatterPoints]);

  // Horizontal-only zoom handlers
  const handleZoomIn = () => {
    setZoomFactor((prev) => {
      const next = Math.min(Number((prev + 0.5).toFixed(1)), 4);
      const span = Math.round(fullMaxMileage / next);
      const curCenter = (dynamicMileageDomain[0] + dynamicMileageDomain[1]) / 2;
      let newMin = Math.max(0, Math.round(curCenter - span / 2));
      let newMax = newMin + span;
      if (newMax > fullMaxMileage) {
        newMax = fullMaxMileage;
        newMin = Math.max(0, newMax - span);
      }
      setMileageMin(newMin);
      setMileageMax(newMax);
      setSelectedMileagePreset('custom');
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoomFactor((prev) => {
      const next = Math.max(Number((prev - 0.5).toFixed(1)), 1);
      if (next === 1) {
        handleResetZoom();
        return 1;
      }
      const span = Math.round(fullMaxMileage / next);
      const curCenter = (dynamicMileageDomain[0] + dynamicMileageDomain[1]) / 2;
      let newMin = Math.max(0, Math.round(curCenter - span / 2));
      let newMax = newMin + span;
      if (newMax > fullMaxMileage) {
        newMax = fullMaxMileage;
        newMin = Math.max(0, newMax - span);
      }
      setMileageMin(newMin);
      setMileageMax(newMax);
      setSelectedMileagePreset('custom');
      return next;
    });
  };

  const handlePanLeft = () => {
    const span = (mileageMax || fullMaxMileage) - mileageMin;
    const step = Math.round(span * 0.35);
    const newMin = Math.max(0, mileageMin - step);
    const newMax = newMin + span;
    setMileageMin(newMin);
    setMileageMax(newMax);
    setSelectedMileagePreset('custom');
  };

  const handlePanRight = () => {
    const span = (mileageMax || fullMaxMileage) - mileageMin;
    const step = Math.round(span * 0.35);
    const newMax = Math.min(fullMaxMileage, (mileageMax || fullMaxMileage) + step);
    const newMin = Math.max(0, newMax - span);
    setMileageMin(newMin);
    setMileageMax(newMax);
    setSelectedMileagePreset('custom');
  };

  const handleResetZoom = () => {
    setZoomFactor(1);
    setMileageMin(0);
    setMileageMax(null);
    setSelectedMileagePreset('all');
  };

  const handleSelectBracket = (bracket) => {
    setSelectedMileagePreset(bracket);
    if (bracket === 'all') {
      handleResetZoom();
    } else if (bracket === '0-30k') {
      setMileageMin(0);
      setMileageMax(30000);
      setZoomFactor(Math.max(1, Number((fullMaxMileage / 30000).toFixed(1))));
    } else if (bracket === '30-70k') {
      setMileageMin(30000);
      setMileageMax(70000);
      setZoomFactor(Math.max(1, Number((fullMaxMileage / 40000).toFixed(1))));
    } else if (bracket === '70-120k') {
      setMileageMin(70000);
      setMileageMax(120000);
      setZoomFactor(Math.max(1, Number((fullMaxMileage / 50000).toFixed(1))));
    } else if (bracket === '120k+') {
      setMileageMin(120000);
      setMileageMax(fullMaxMileage);
      setZoomFactor(Math.max(1, Number((fullMaxMileage / Math.max(15000, fullMaxMileage - 120000)).toFixed(1))));
    }
  };

  // Safe single-finger touch swipe for horizontal panning (NO page zooming)
  const touchStartRef = useRef(null);

  const handleChartTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleChartTouchEnd = (e) => {
    if (!touchStartRef.current || !e.changedTouches.length) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;

    // Only pan horizontally if horizontal movement strongly exceeds vertical movement
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0) {
        handlePanLeft();
      } else {
        handlePanRight();
      }
    }
    touchStartRef.current = null;
  };

  if (loading || !analytics || analytics.total_listings === 0) {
    return (
      <div className="bg-white dark:bg-[#0D2342] border border-slate-200 dark:border-[#1C3B66] rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center text-slate-500 dark:text-slate-400 shadow-sm transition-colors duration-200">
        <p className="text-xs sm:text-sm font-medium">Fetch or load listings above to view interactive market charts and deal analytics.</p>
      </div>
    );
  }

  const handleDotClick = (point) => {
    if (!point) return;
    // If clicking an already inspected point or on double-tap, immediately open the listing!
    if (activeScatterPoint?.id === point.id && point.url) {
      window.open(point.url, '_blank');
      return;
    }
    setActiveScatterPoint(point);
  };

  const isLight = theme === 'light';
  const gridStroke = isLight ? '#E2E8F0' : '#16345C';
  const tickStroke = isLight ? '#64748B' : '#94A3B8';

  return (
    <div className="bg-white dark:bg-[#0D2342] border border-slate-200 dark:border-[#1C3B66] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm dark:shadow-2xl relative transition-colors duration-200">
      
      {/* Chart Header, Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-slate-200 dark:border-[#1C3B66]">
        <div>
          <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#C8232C]" />
            <span>Market Price Dynamics & Analytics</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Analyzing {analytics.total_listings.toLocaleString()} vehicles across years, mileage & trim levels
          </p>
        </div>

        {/* Action Controls: Chart Tabs + Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Chart View Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-[#061021] p-1 rounded-xl border border-slate-200 dark:border-[#1A3B6B] overflow-x-auto no-scrollbar w-full sm:w-auto shadow-inner">
            <button
              onClick={() => setActiveTab('year')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'year'
                  ? 'bg-gradient-to-r from-[#C8232C] to-[#A81B23] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>By Year</span>
            </button>

            <button
              onClick={() => setActiveTab('scatter')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'scatter'
                  ? 'bg-gradient-to-r from-[#C8232C] to-[#A81B23] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ScatterIcon className="w-3.5 h-3.5" />
              <span>Deal Finder</span>
            </button>

            <button
              onClick={() => setActiveTab('variants')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'variants'
                  ? 'bg-gradient-to-r from-[#C8232C] to-[#A81B23] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Trims</span>
            </button>

            <button
              onClick={() => setActiveTab('distribution')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'distribution'
                  ? 'bg-gradient-to-r from-[#C8232C] to-[#A81B23] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Brackets</span>
            </button>
          </div>

          {/* Zoom Toolbar for Scatter Plot */}
          {activeTab === 'scatter' && scatterSubView === 'chart' && (
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-[#061021] p-1 rounded-xl border border-slate-200 dark:border-[#1A3B6B] text-xs">
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#16345C] rounded-lg transition"
              >
                <ZoomIn className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#16345C] rounded-lg transition"
              >
                <ZoomOut className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset Zoom"
                className="p-1 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#16345C] rounded-lg transition flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="text-[10px] hidden md:inline">Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart Views Container */}
      <div className={`${activeTab === 'variants' ? 'min-h-[460px] md:h-96' : activeTab === 'scatter' ? 'min-h-[450px] sm:min-h-[480px]' : 'h-72 sm:h-96'} w-full`}>

        {/* 1. Price by Model Year (Mobile-friendly ticks + Era presets) */}
        {activeTab === 'year' && (
          <div className="w-full h-full flex flex-col">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 flex flex-wrap items-center justify-between gap-1.5 px-1">
              <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar">
                <span className="text-slate-600 dark:text-slate-400 font-bold mr-1 hidden sm:inline">Filter Era:</span>
                {[
                  { id: 'all', label: 'All Years' },
                  { id: '2020+', label: '2020-2025' },
                  { id: '2015-19', label: '2015-2019' },
                  { id: 'pre2015', label: 'Pre-2015' }
                ].map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setEraFilter(e.id)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition whitespace-nowrap ${
                      eraFilter === e.id
                        ? 'bg-[#C8232C] text-white shadow'
                        : 'bg-slate-100 dark:bg-[#112646] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1A3B6B]'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-[10px] hidden sm:inline">Bars = Average Price (Lacs)</span>
            </div>

            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredYearStats} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke={tickStroke}
                    tick={{ fill: tickStroke, fontSize: 10 }}
                    tickLine={false}
                    minTickGap={16}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke={tickStroke}
                    tick={{ fill: tickStroke, fontSize: 10 }}
                    tickLine={false}
                    width={40}
                    tickFormatter={(val) => `${val}L`}
                  />
                  <Tooltip content={<YearTooltip theme={theme} />} />
                  <Bar
                    dataKey="avg_price_lacs"
                    name="Average Price (Lacs)"
                    fill="#1D70B8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  >
                    {filteredYearStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.year >= 2022 ? '#C8232C' : '#1D70B8'}
                      />
                    ))}
                  </Bar>
                  {/* Interactive Recharts Brush shown on desktop */}
                  <Brush
                    dataKey="year"
                    height={20}
                    stroke="#C8232C"
                    fill={isLight ? '#F1F5F9' : '#08162b'}
                    tickFormatter={(v) => `${v}`}
                    className="hidden sm:block"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 2. OVERHAULED DEAL FINDER (Scatter Plot + Top Deals Mode) */}
        {activeTab === 'scatter' && (
          <div className="w-full h-full flex flex-col justify-between">
            
            {/* Inline Fair Value Explainer Line with (i) Icon */}
            <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
              <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-2">
                <button
                  type="button"
                  onClick={() => setShowFairValueModal(true)}
                  title="How Fair Value is calculated"
                  className="p-0.5 rounded-full hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-600 dark:text-sky-400 flex-shrink-0 transition"
                >
                  <Info className="w-4 h-4" />
                </button>
                <div className="truncate text-[10px] sm:text-[11px]">
                  <strong className="text-slate-900 dark:text-white font-bold">Fair Value:</strong> Expected price by mileage. 
                  <span className="ml-1 text-emerald-700 dark:text-emerald-400 font-bold">🟢 Deal (&gt;8% below)</span> • 
                  <span className="text-sky-700 dark:text-sky-400 font-bold">🔵 Fair (±8%)</span> • 
                  <span className="text-amber-700 dark:text-amber-400 font-bold">🟡 Above (&gt;8% above)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFairValueModal(true)}
                className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 flex items-center space-x-0.5 flex-shrink-0 underline"
              >
                <span>Details</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Top Toolbar: View Switcher (Chart vs Top Deals) + Quick Deal Quality Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-[#1C3B66]/60">
              
              {/* Quick Quality Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setDealRatingFilter('all')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 flex-shrink-0 ${
                    dealRatingFilter === 'all'
                      ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-[#112646] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1A3B6B]'
                  }`}
                >
                  <span>All ({ratingCounts.all})</span>
                </button>

                <button
                  onClick={() => setDealRatingFilter('great')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 flex-shrink-0 ${
                    dealRatingFilter === 'great'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  <span>🔥 Great Deals ({ratingCounts.great})</span>
                </button>

                <button
                  onClick={() => setDealRatingFilter('fair')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 flex-shrink-0 ${
                    dealRatingFilter === 'fair'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                  <span>Fair ({ratingCounts.fair})</span>
                </button>

                <button
                  onClick={() => setDealRatingFilter('above')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 flex-shrink-0 ${
                    dealRatingFilter === 'above'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  <span>Above Avg ({ratingCounts.above})</span>
                </button>
              </div>

              {/* Action Tools: Fair Value Guide & Sub-view toggle */}
              <div className="flex items-center flex-wrap gap-2">
                {/* Fair Value Line Indicator */}
                {scatterSubView === 'chart' && (
                  <div className="hidden md:flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                    <span className="w-3.5 h-0.5 border-t-2 border-dashed border-emerald-500 inline-block" />
                    <span>Fair Value Line</span>
                  </div>
                )}

                {/* Sub-view toggle: Chart vs Top Deals List */}
                <div className="flex items-center bg-slate-100 dark:bg-[#061021] p-0.5 rounded-lg border border-slate-200 dark:border-[#1A3B6B]">
                  <button
                    onClick={() => setScatterSubView('chart')}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                      scatterSubView === 'chart'
                        ? 'bg-white dark:bg-[#112646] text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    📈 Scatter Chart
                  </button>
                  <button
                    onClick={() => setScatterSubView('top_deals')}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center space-x-1 ${
                      scatterSubView === 'top_deals'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Award className="w-3 h-3" />
                    <span>🏆 Top {topDealsList.length} Deals</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Quick Mileage Filter Chips & Pan Controls (For Scatter View) */}
            {scatterSubView === 'chart' && (
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 px-1 text-[10px]">
                <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
                  <span className="font-bold text-slate-500 dark:text-slate-400 mr-1 hidden sm:inline">Mileage:</span>
                  {[
                    { id: 'all', label: 'All Mileage' },
                    { id: '0-30k', label: '0–30k km' },
                    { id: '30-70k', label: '30–70k km' },
                    { id: '70-120k', label: '70–120k km' },
                    { id: '120k+', label: '120k+ km' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBracket(b.id)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition whitespace-nowrap ${
                        selectedMileagePreset === b.id
                          ? 'bg-[#1D70B8] text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-[#112646] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#1A3B6B]'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                {/* Pan Controls when zoomed or bracket selected */}
                {(zoomFactor > 1 || selectedMileagePreset !== 'all') && (
                  <div className="flex items-center space-x-1 bg-slate-100 dark:bg-[#061021] p-0.5 rounded-lg border border-slate-200 dark:border-[#1A3B6B]">
                    <button
                      type="button"
                      onClick={handlePanLeft}
                      disabled={dynamicMileageDomain[0] <= 0}
                      title="Pan Left (Lower Mileage)"
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#16345C] disabled:opacity-30 disabled:pointer-events-none transition flex items-center space-x-0.5"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      <span className="hidden xs:inline">Pan Left</span>
                    </button>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 px-1 font-semibold">
                      {(dynamicMileageDomain[0] / 1000).toFixed(0)}k–{(dynamicMileageDomain[1] / 1000).toFixed(0)}k
                    </span>
                    <button
                      type="button"
                      onClick={handlePanRight}
                      disabled={dynamicMileageDomain[1] >= fullMaxMileage}
                      title="Pan Right (Higher Mileage)"
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#16345C] disabled:opacity-30 disabled:pointer-events-none transition flex items-center space-x-0.5"
                    >
                      <span className="hidden xs:inline">Pan Right</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* View A: Interactive Top Deals List (100% Mobile Usable!) */}
            {scatterSubView === 'top_deals' ? (
              <div className="flex-1 w-full overflow-y-auto max-h-[310px] sm:max-h-[340px] pr-1 space-y-2">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pb-1 flex items-center justify-between">
                  <span>Vehicles ranked by highest market savings & value:</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Best Bargains</span>
                </div>

                {topDealsList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No deals match the current filter. Switch back to "All" to inspect the market.
                  </div>
                ) : (
                  topDealsList.map((car, idx) => {
                    const avgLacs = analytics?.avg_price_lacs || 0;
                    const diffLacs = avgLacs > car.price_lacs ? (avgLacs - car.price_lacs).toFixed(1) : null;

                    return (
                      <div
                        key={car.id || idx}
                        onClick={() => setActiveScatterPoint(car)}
                        className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer ${
                          activeScatterPoint?.id === car.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/50'
                            : 'bg-slate-50 dark:bg-[#112646] hover:bg-slate-100 dark:hover:bg-[#16345C] border-slate-200 dark:border-[#1C3B66]'
                        }`}
                      >
                        <div className="flex items-start space-x-2.5 truncate">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-black text-xs flex items-center justify-center flex-shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="truncate">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate max-w-[200px] sm:max-w-xs">
                                {car.title || `${car.year} Model`}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                {car.rating}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {car.year} Model • {car.mileage?.toLocaleString()} km
                              {diffLacs && (
                                <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                  (~{diffLacs}L below avg)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-[#1A3B6B]">
                          <div className="text-left sm:text-right">
                            <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs sm:text-sm block">
                              PKR {car.price_lacs} Lacs
                            </span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                              ({car.price?.toLocaleString()} PKR)
                            </span>
                          </div>

                          {car.url ? (
                            <a
                              href={car.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1 rounded-lg bg-[#C8232C] hover:bg-[#A81B23] text-white font-bold text-[10px] flex items-center space-x-1 shadow transition flex-shrink-0"
                            >
                              <span>View Ad</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <button
                              onClick={() => setActiveScatterPoint(car)}
                              className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold"
                            >
                              Inspect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* View B: Dynamic Scaling Scatter Plot (Horizontal Mileage Zoom only, Fixed Price Y-Axis) */
              <>
                <div
                  className="w-full h-[270px] sm:h-[310px] md:h-[340px] relative select-none"
                  style={{ touchAction: 'pan-y' }}
                  onTouchStart={handleChartTouchStart}
                  onTouchEnd={handleChartTouchEnd}
                >
                  {/* Floating On-Chart Horizontal Zoom Toolbar */}
                  <div className="absolute top-2 right-2 z-20 flex items-center bg-white/95 dark:bg-[#08162B]/95 backdrop-blur-md border border-slate-300 dark:border-[#1C3B66] rounded-xl p-1 shadow-lg space-x-1">
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      className="p-1 sm:p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#112646] dark:hover:bg-[#1C3B66] text-slate-800 dark:text-white transition shadow-sm font-bold flex items-center justify-center"
                      title="Zoom In Mileage (Horizontal only)"
                    >
                      <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 dark:text-sky-400" />
                    </button>
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      className="p-1 sm:p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#112646] dark:hover:bg-[#1C3B66] text-slate-800 dark:text-white transition shadow-sm font-bold flex items-center justify-center"
                      title="Zoom Out Mileage"
                    >
                      <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 dark:text-sky-400" />
                    </button>
                    {(zoomFactor > 1 || selectedMileagePreset !== 'all') && (
                      <button
                        type="button"
                        onClick={handleResetZoom}
                        className="p-1 sm:p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#112646] dark:hover:bg-[#1C3B66] text-amber-600 dark:text-amber-400 transition shadow-sm font-bold flex items-center justify-center"
                        title="Reset to Full Mileage"
                      >
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 px-1 font-semibold hidden xs:inline">
                      {zoomFactor > 1 ? `${zoomFactor}x` : 'Swipe to pan'}
                    </span>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis
                        type="number"
                        dataKey="mileage"
                        name="Mileage"
                        stroke={tickStroke}
                        domain={dynamicMileageDomain}
                        allowDataOverflow={true}
                        tick={{ fill: tickStroke, fontSize: 10 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k km`}
                      />
                      <YAxis
                        type="number"
                        dataKey="price_lacs"
                        name="Price"
                        stroke={tickStroke}
                        domain={dynamicPriceDomain}
                        allowDataOverflow={true}
                        tick={{ fill: tickStroke, fontSize: 10 }}
                        width={42}
                        tickFormatter={(v) => `${v}L`}
                      />
                      {/* Responsive touch size */}
                      <ZAxis range={[100, 100]} />
                      <Tooltip
                        content={<ScatterTooltip />}
                        wrapperStyle={{ pointerEvents: 'auto', zIndex: 50 }}
                        cursor={{ strokeDasharray: '3 3', stroke: isLight ? '#94A3B8' : '#334155' }}
                      />
                      {/* Fair Value Regression Trendline */}
                      {fairValueTrendData.length > 0 && (
                        <Scatter
                          name="Fair Market Value Trend"
                          data={fairValueTrendData}
                          line={{ stroke: isLight ? '#059669' : '#10B981', strokeWidth: 2, strokeDasharray: '5 5' }}
                          shape={() => null}
                          legendType="none"
                          isAnimationActive={false}
                        />
                      )}
                      {/* Vehicle Scatter Points */}
                      <Scatter
                        name="Vehicles"
                        data={displayedScatterPoints}
                        onClick={(node) => handleDotClick(node.payload || node)}
                        cursor="pointer"
                      >
                        {displayedScatterPoints.map((entry, index) => {
                          const isSelected = activeScatterPoint?.id === entry.id;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              fillOpacity={isSelected ? 1 : 0.82}
                              stroke={isSelected ? '#FFFFFF' : isLight ? '#FFFFFF' : '#0B1E38'}
                              strokeWidth={isSelected ? 2.5 : 1}
                            />
                          );
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Mobile / Desktop Tap-to-Inspect Card */}
                {currentInspectPoint && (
                  <div
                    onClick={() => currentInspectPoint.url && window.open(currentInspectPoint.url, '_blank')}
                    className="mt-2.5 p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#112646] border border-slate-200 dark:border-[#1C3B66] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-md cursor-pointer hover:border-[#C8232C] dark:hover:border-[#C8232C] transition-all group"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex-shrink-0 ${
                        currentInspectPoint.rating === 'Great Deal'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                          : currentInspectPoint.rating === 'Above Market'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                          : 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40'
                      }`}>
                        {currentInspectPoint.rating}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-xs">{currentInspectPoint.title || `${currentInspectPoint.year} Model`}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {currentInspectPoint.year} Model • {currentInspectPoint.mileage?.toLocaleString()} km
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-[#1A3B6B]">
                      <div className="text-left sm:text-right">
                        <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs sm:text-sm block">PKR {currentInspectPoint.price_lacs} Lacs</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">({currentInspectPoint.price?.toLocaleString()} PKR)</span>
                      </div>
                      {currentInspectPoint.url && (
                        <a
                          href={currentInspectPoint.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#C8232C] to-[#A81B23] hover:from-[#E02832] text-white font-bold text-[10px] flex items-center space-x-1 shadow transition flex-shrink-0"
                        >
                          <span>View Ad</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* 3. Variants & Trims Share (Responsive auto-height for mobile) */}
        {activeTab === 'variants' && (
          <div className="w-full h-full flex flex-col md:grid md:grid-cols-2 gap-4 items-center">
            <div className="w-full h-56 sm:h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.variant_stats}
                    dataKey="count"
                    nameKey="variant"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={48}
                    paddingAngle={3}
                  >
                    {analytics.variant_stats.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${val} cars (${item.payload.percent_share}%) - Avg: ${item.payload.avg_price_lacs} Lacs`,
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: isLight ? '#FFFFFF' : '#0D2342',
                      borderColor: isLight ? '#CBD5E1' : '#1C3B66',
                      borderRadius: '12px',
                      color: isLight ? '#0F172A' : '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* List breakdown */}
            <div className="w-full space-y-1.5 overflow-y-auto max-h-60 sm:max-h-72 pr-1 text-xs">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs mb-1.5">Variant Price & Volume Breakdown:</h4>
              {analytics.variant_stats.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#112646] border border-slate-200 dark:border-[#1A3B6B]">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="font-bold text-slate-900 dark:text-white text-xs truncate">{v.variant}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="text-sky-600 dark:text-sky-400 font-bold text-xs">{v.avg_price_lacs} Lacs</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] ml-1.5">({v.count} cars)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Price Bracket Distribution (Compact formatted mobile ticks) */}
        {activeTab === 'distribution' && (
          <div className="w-full h-full flex flex-col">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 px-1">
              Inventory distribution by price bracket:
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.price_distribution} margin={{ top: 10, right: 10, left: -15, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="range"
                    stroke={tickStroke}
                    tick={{ fill: tickStroke, fontSize: 10 }}
                    tickLine={false}
                    minTickGap={10}
                    tickFormatter={(val) => {
                      if (!val) return '';
                      return val.replace(/\s*Lacs/gi, 'L').replace(/\s*Crore/gi, 'Cr').replace(/\s*-\s*/g, '-');
                    }}
                  />
                  <YAxis
                    stroke={tickStroke}
                    tick={{ fill: tickStroke, fontSize: 10 }}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    formatter={(val) => [`${val} cars`, 'Inventory']}
                    contentStyle={{
                      backgroundColor: isLight ? '#FFFFFF' : '#0D2342',
                      borderColor: isLight ? '#CBD5E1' : '#1C3B66',
                      borderRadius: '12px',
                      color: isLight ? '#0F172A' : '#fff'
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    {analytics.price_distribution.map((entry, index) => (
                      <Cell
                        key={`dist-${index}`}
                        fill={index % 2 === 0 ? '#10B981' : '#1D70B8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

      {/* Fair Value Methodology Modal */}
      {showFairValueModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowFairValueModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#0D2342] border border-slate-200 dark:border-[#1C3B66] rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-[#1A3B6B]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    How Fair Value is Calculated
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    PakWheels Insights Market Pricing & Deal Algorithm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFairValueModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#112646] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation Steps */}
            <div className="mt-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#112646] border border-slate-200 dark:border-[#1A3B6B]">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1 flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                  <span>Active Market Median Baseline</span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  We collect current real-world asking prices across all listings for this vehicle make and model, removing statistical extreme outliers (e.g. invalid 600k+ km listings) to establish the authentic asking price distribution.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#112646] border border-slate-200 dark:border-[#1A3B6B]">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1 flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                  <span>Mileage Depreciation Curve (Green Dashed Line)</span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  A vehicle with 20,000 km is worth more than the same model with 120,000 km. We calculate a linear regression trendline across odometer mileage and price. The green dashed line shows exactly what the market expects a car with that mileage to cost.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#112646] border border-slate-200 dark:border-[#1A3B6B]">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1.5 flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
                  <span>Deal Rating Thresholds</span>
                </h4>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                      Great Deal
                    </span>
                    <span>Priced <strong>&gt; 8% below</strong> the fair market curve for its mileage. High bargain potential!</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex-shrink-0">
                      Fair Price
                    </span>
                    <span>Priced within <strong>±8%</strong> of the expected market baseline for its odometer reading.</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex-shrink-0">
                      Above Market
                    </span>
                    <span>Priced <strong>&gt; 8% higher</strong> than standard valuation (often leaves strong room to negotiate).</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#1A3B6B] flex justify-end">
              <button
                type="button"
                onClick={() => setShowFairValueModal(false)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
