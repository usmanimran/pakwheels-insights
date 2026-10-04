import React, { useState, useMemo } from 'react';
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
  BarChart2, ExternalLink, ZoomIn, ZoomOut, RotateCcw, Calendar, Check
} from 'lucide-react';

// Custom Tooltip for Price vs Model Year
const YearTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0D2342] border border-[#1C3B66] p-2.5 sm:p-3 rounded-xl shadow-2xl text-xs space-y-1 backdrop-blur-md">
        <p className="font-black text-white text-xs sm:text-sm mb-0.5">{label} Model</p>
        <p className="text-slate-300">
          Average: <strong className="text-sky-400 font-bold">{data.avg_price_lacs} Lacs</strong>
        </p>
        <p className="text-slate-400 text-[11px]">
          Range: {data.min_price_lacs} - {data.max_price_lacs} Lacs
        </p>
        <p className="text-slate-400 text-[11px]">
          Inventory: <span className="text-white font-bold">{data.count} cars</span>
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
    return (
      <div className="bg-[#0D2342]/95 border border-[#1C3B66] p-3 rounded-xl shadow-2xl text-xs space-y-1 max-w-xs backdrop-blur-md">
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="font-bold text-white truncate text-[11px] sm:text-xs">{data.title || `${data.year} Model`}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex-shrink-0 ${
              data.rating === 'Great Deal'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : data.rating === 'Above Market'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }`}
          >
            {data.rating}
          </span>
        </div>
        <p className="text-xs sm:text-sm font-black text-emerald-400">
          PKR {data.price_lacs} Lacs
          <span className="text-slate-400 text-[10px] font-normal ml-1">
            ({data.price?.toLocaleString()} PKR)
          </span>
        </p>
        <div className="text-slate-300 flex items-center justify-between text-[10px] pt-1 border-t border-[#1A3B6B]">
          <span>Year: <strong className="text-white">{data.year}</strong></span>
          <span>Mileage: <strong className="text-white">{data.mileage?.toLocaleString()} km</strong></span>
        </div>
      </div>
    );
  }
  return null;
};

const PIE_COLORS = ['#C8232C', '#1D70B8', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#E11D48'];

export default function ChartsDashboard({ analytics, loading }) {
  const [activeTab, setActiveTab] = useState('year'); // 'year', 'scatter', 'variants', 'distribution'
  const [eraFilter, setEraFilter] = useState('all'); // 'all', '2020+', '2015-19', 'pre2015'

  // Zoom State for Scatter Plot
  const [zoomFactor, setZoomFactor] = useState(1);
  const [mileageZoomMax, setMileageZoomMax] = useState(150000);
  const [priceZoomMax, setPriceZoomMax] = useState(50); // In Lacs
  const [activeScatterPoint, setActiveScatterPoint] = useState(null);

  // Compute filtered year stats for mobile era filter
  const filteredYearStats = useMemo(() => {
    if (!analytics?.year_stats) return [];
    if (eraFilter === '2020+') return analytics.year_stats.filter((y) => y.year >= 2020);
    if (eraFilter === '2015-19') return analytics.year_stats.filter((y) => y.year >= 2015 && y.year <= 2019);
    if (eraFilter === 'pre2015') return analytics.year_stats.filter((y) => y.year < 2015);
    return analytics.year_stats;
  }, [analytics?.year_stats, eraFilter]);

  // Compute zoomed scatter points
  const zoomedScatterPoints = useMemo(() => {
    if (!analytics?.scatter_points) return [];
    return analytics.scatter_points.filter(
      (p) => p.mileage <= mileageZoomMax && p.price_lacs <= priceZoomMax
    );
  }, [analytics?.scatter_points, mileageZoomMax, priceZoomMax]);

  // Set default active point to the best deal if none selected
  const currentInspectPoint = useMemo(() => {
    if (activeScatterPoint) return activeScatterPoint;
    if (zoomedScatterPoints.length > 0) {
      // Find first Great Deal
      const deal = zoomedScatterPoints.find((p) => p.rating === 'Great Deal');
      return deal || zoomedScatterPoints[0];
    }
    return null;
  }, [activeScatterPoint, zoomedScatterPoints]);

  const handleZoomIn = () => {
    setZoomFactor((prev) => Math.min(prev + 0.5, 3));
    setMileageZoomMax((prev) => Math.max(Math.round(prev * 0.75), 30000));
    setPriceZoomMax((prev) => Math.max(Math.round(prev * 0.75), 15));
  };

  const handleZoomOut = () => {
    setZoomFactor((prev) => Math.max(prev - 0.5, 1));
    setMileageZoomMax((prev) => Math.min(Math.round(prev * 1.33), 200000));
    setPriceZoomMax((prev) => Math.min(Math.round(prev * 1.33), 100));
  };

  const handleResetZoom = () => {
    setZoomFactor(1);
    setMileageZoomMax(150000);
    setPriceZoomMax(50);
  };

  if (loading || !analytics || analytics.total_listings === 0) {
    return (
      <div className="bg-[#0D2342] border border-[#1C3B66] rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center text-slate-400">
        <p className="text-xs sm:text-sm font-medium">Fetch or load listings above to view interactive market charts and deal analytics.</p>
      </div>
    );
  }

  const handleDotClick = (point) => {
    if (point) {
      setActiveScatterPoint(point);
    }
  };

  return (
    <div className="bg-[#0D2342] border border-[#1C3B66] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl relative">
      
      {/* Chart Header, Tabs & Zoom Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-[#1C3B66]">
        <div>
          <h3 className="font-black text-sm sm:text-base text-white flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#C8232C]" />
            <span>Market Price Dynamics & Analytics</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-medium">
            Analyzing {analytics.total_listings.toLocaleString()} vehicles across years, mileage & trim levels
          </p>
        </div>

        {/* Action Controls: Chart Tabs + Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Chart View Tabs (Touch-friendly & horizontal scrolling) */}
          <div className="flex items-center bg-[#061021] p-1 rounded-xl border border-[#1A3B6B] overflow-x-auto no-scrollbar w-full sm:w-auto shadow-inner">
            <button
              onClick={() => setActiveTab('year')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'year'
                  ? 'bg-gradient-to-r from-[#C8232C] to-[#A81B23] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
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
                  : 'text-slate-400 hover:text-white'
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
                  : 'text-slate-400 hover:text-white'
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
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Brackets</span>
            </button>
          </div>

          {/* Zoom Toolbar for Scatter Plot */}
          {activeTab === 'scatter' && (
            <div className="flex items-center space-x-1 bg-[#061021] p-1 rounded-xl border border-[#1A3B6B] text-xs">
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1 text-slate-300 hover:text-white hover:bg-[#16345C] rounded-lg transition"
              >
                <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1 text-slate-300 hover:text-white hover:bg-[#16345C] rounded-lg transition"
              >
                <ZoomOut className="w-3.5 h-3.5 text-sky-400" />
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset Zoom"
                className="p-1 text-slate-300 hover:text-white hover:bg-[#16345C] rounded-lg transition flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] hidden md:inline">Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart Views */}
      <div className={`${activeTab === 'variants' ? 'min-h-[460px] md:h-96' : 'h-72 sm:h-96'} w-full`}>

        {/* 1. Price by Model Year (Mobile-friendly ticks + Era presets) */}
        {activeTab === 'year' && (
          <div className="w-full h-full flex flex-col">
            <div className="text-[11px] text-slate-400 mb-2 flex flex-wrap items-center justify-between gap-1.5 px-1">
              <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar">
                <span className="text-slate-400 font-bold mr-1 hidden sm:inline">Filter Era:</span>
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
                        : 'bg-[#112646] text-slate-300 hover:text-white border border-[#1A3B6B]'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
              <span className="text-slate-400 text-[10px] hidden sm:inline">Bars = Average Price (Lacs)</span>
            </div>

            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredYearStats} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#16345C" vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    minTickGap={16}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    width={34}
                    tickFormatter={(val) => `${val}L`}
                  />
                  <Tooltip content={<YearTooltip />} />
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
                    fill="#08162b"
                    tickFormatter={(v) => `${v}`}
                    className="hidden sm:block"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 2. Price vs Mileage Scatter Plot (Deal Finder + Tap-to-Inspect Card) */}
        {activeTab === 'scatter' && (
          <div className="w-full h-full flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between text-[11px] px-1 mb-1.5 text-slate-300 gap-1.5">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-emerald-400 font-bold">Great Deal</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
                  <span className="text-sky-300">Fair Price</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span className="text-amber-300">Above Avg</span>
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Tap dot to inspect car ({zoomedScatterPoints.length} listings)
              </div>
            </div>

            <div className="flex-1 w-full min-h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#16345C" />
                  <XAxis
                    type="number"
                    dataKey="mileage"
                    name="Mileage"
                    unit=" km"
                    stroke="#64748b"
                    domain={[0, mileageZoomMax]}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="number"
                    dataKey="price_lacs"
                    name="Price"
                    unit=" Lacs"
                    stroke="#64748b"
                    domain={[0, priceZoomMax]}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    width={34}
                    tickFormatter={(v) => `${v}L`}
                  />
                  {/* Larger touch range for mobile */}
                  <ZAxis range={[90, 90]} />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter
                    name="Vehicles"
                    data={zoomedScatterPoints}
                    onClick={(node) => handleDotClick(node.payload || node)}
                    cursor="pointer"
                  >
                    {zoomedScatterPoints.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Mobile / Desktop Tap-to-Inspect Card */}
            {currentInspectPoint && (
              <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl bg-[#112646] border border-[#1C3B66] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-md">
                <div className="flex items-center space-x-2 truncate">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex-shrink-0 ${
                    currentInspectPoint.rating === 'Great Deal'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : currentInspectPoint.rating === 'Above Market'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  }`}>
                    {currentInspectPoint.rating}
                  </span>
                  <div className="truncate">
                    <p className="font-bold text-white text-xs truncate max-w-xs">{currentInspectPoint.title || `${currentInspectPoint.year} Model`}</p>
                    <p className="text-[10px] text-slate-400">
                      {currentInspectPoint.year} Model • {currentInspectPoint.mileage?.toLocaleString()} km
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[#1A3B6B]">
                  <div className="text-left sm:text-right">
                    <span className="text-emerald-400 font-black text-xs sm:text-sm block">PKR {currentInspectPoint.price_lacs} Lacs</span>
                    <span className="text-[9px] text-slate-400 font-medium">({currentInspectPoint.price?.toLocaleString()} PKR)</span>
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
                    contentStyle={{ backgroundColor: '#0D2342', borderColor: '#1C3B66', borderRadius: '12px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* List breakdown */}
            <div className="w-full space-y-1.5 overflow-y-auto max-h-60 sm:max-h-72 pr-1 text-xs">
              <h4 className="font-bold text-slate-300 text-xs mb-1.5">Variant Price & Volume Breakdown:</h4>
              {analytics.variant_stats.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-[#112646] border border-[#1A3B6B]">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="font-bold text-white text-xs truncate">{v.variant}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="text-sky-400 font-bold text-xs">{v.avg_price_lacs} Lacs</span>
                    <span className="text-slate-400 text-[10px] ml-1.5">({v.count} cars)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Price Bracket Distribution (Compact formatted mobile ticks) */}
        {activeTab === 'distribution' && (
          <div className="w-full h-full flex flex-col">
            <div className="text-[11px] text-slate-400 mb-1 px-1">
              Inventory distribution by price bracket:
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.price_distribution} margin={{ top: 10, right: 10, left: -15, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#16345C" vertical={false} />
                  <XAxis
                    dataKey="range"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    minTickGap={10}
                    tickFormatter={(val) => {
                      if (!val) return '';
                      return val.replace(/\s*Lacs/gi, 'L').replace(/\s*Crore/gi, 'Cr').replace(/\s*-\s*/g, '-');
                    }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    width={34}
                  />
                  <Tooltip
                    formatter={(val) => [`${val} cars`, 'Inventory']}
                    contentStyle={{ backgroundColor: '#0D2342', borderColor: '#1C3B66', borderRadius: '12px', color: '#fff' }}
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
    </div>
  );
}
