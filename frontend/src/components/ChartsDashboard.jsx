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
  BarChart2, ExternalLink, ZoomIn, ZoomOut, RotateCcw, Sliders
} from 'lucide-react';

// Custom Tooltip for Price vs Model Year
const YearTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1">
        <p className="font-bold text-white text-sm mb-1">{label} Model</p>
        <p className="text-slate-300">
          Average Price: <strong className="text-sky-400">{data.avg_price_lacs} Lacs</strong>
        </p>
        <p className="text-slate-400">
          Range: {data.min_price_lacs} - {data.max_price_lacs} Lacs
        </p>
        <p className="text-slate-400">
          Listings: <span className="text-slate-200 font-semibold">{data.count} cars</span>
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
      <div className="bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 max-w-xs backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-white truncate">{data.title || `${data.year} Model`}</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              data.rating === 'Great Deal'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : data.rating === 'Above Market'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
            }`}
          >
            {data.rating}
          </span>
        </div>
        <p className="text-sm font-black text-white">
          PKR {data.price_lacs} Lacs
          <span className="text-slate-400 text-xs font-normal ml-1">
            ({data.price?.toLocaleString()} PKR)
          </span>
        </p>
        <div className="text-slate-400 flex items-center justify-between text-[11px]">
          <span>Year: <strong className="text-slate-200">{data.year}</strong></span>
          <span>Mileage: <strong className="text-slate-200">{data.mileage?.toLocaleString()} km</strong></span>
        </div>
        {data.url && (
          <p className="text-[10px] text-sky-400 flex items-center space-x-1 pt-1 border-t border-slate-800">
            <span>Click dot to view original ad</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </p>
        )}
      </div>
    );
  }
  return null;
};

const PIE_COLORS = ['#38BDF8', '#818CF8', '#34D399', '#FBBF24', '#F472B6', '#A78BFA', '#FB7185'];

export default function ChartsDashboard({ analytics, loading }) {
  const [activeTab, setActiveTab] = useState('year'); // 'year', 'scatter', 'variants', 'distribution'

  // Zoom State for Scatter Plot
  const [zoomFactor, setZoomFactor] = useState(1); // 1, 1.5, 2, 2.5
  const [mileageZoomMax, setMileageZoomMax] = useState(150000);
  const [priceZoomMax, setPriceZoomMax] = useState(50); // In Lacs

  // Compute zoomed scatter points
  const zoomedScatterPoints = useMemo(() => {
    if (!analytics?.scatter_points) return [];
    return analytics.scatter_points.filter(
      (p) => p.mileage <= mileageZoomMax && p.price_lacs <= priceZoomMax
    );
  }, [analytics?.scatter_points, mileageZoomMax, priceZoomMax]);

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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        <p className="text-sm">Fetch or load listings above to view interactive market charts and deal analytics.</p>
      </div>
    );
  }

  const handleDotClick = (point) => {
    if (point && point.url) {
      window.open(point.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
      {/* Chart Header, Tabs & Zoom Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
        <div>
          <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-red-400" />
            <span>Market Price Dynamics & Analytics</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Analyzing {analytics.total_listings} vehicles across model years, mileage depreciation, and variants
          </p>
        </div>

        {/* Action Controls: Chart Tabs + Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart View Tabs */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 overflow-x-auto">
            <button
              onClick={() => setActiveTab('year')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'year'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Price by Year</span>
            </button>

            <button
              onClick={() => setActiveTab('scatter')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'scatter'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ScatterIcon className="w-3.5 h-3.5" />
              <span>Deal Finder (Scatter)</span>
            </button>

            <button
              onClick={() => setActiveTab('variants')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'variants'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Trims</span>
            </button>

            <button
              onClick={() => setActiveTab('distribution')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'distribution'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Price Brackets</span>
            </button>
          </div>

          {/* Zoom Toolbar for Scatter Plot */}
          {activeTab === 'scatter' && (
            <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
              >
                <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
              >
                <ZoomOut className="w-3.5 h-3.5 text-sky-400" />
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset Zoom"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] hidden md:inline">Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart Views */}
      <div className="h-80 sm:h-96 w-full">

        {/* 1. Price by Model Year (with Brush slider for Year Zoom) */}
        {activeTab === 'year' && (
          <div className="w-full h-full flex flex-col">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between px-2">
              <span>Drag the bottom brush handles to zoom into specific model years</span>
              <span className="text-slate-500">Bars = Average Price (Lacs)</span>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.year_stats} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={(val) => `${val}L`}
                  />
                  <Tooltip content={<YearTooltip />} />
                  <Bar
                    dataKey="avg_price_lacs"
                    name="Average Price (Lacs)"
                    fill="#38bdf8"
                    radius={[6, 6, 0, 0]}
                  >
                    {analytics.year_stats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${200 + (index * 15) % 120}, 85%, 55%)`}
                      />
                    ))}
                  </Bar>
                  {/* Interactive Recharts Brush to allow sliding and zooming into year ranges */}
                  <Brush
                    dataKey="year"
                    height={22}
                    stroke="#38bdf8"
                    fill="#0b1120"
                    tickFormatter={(v) => `${v}`}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 2. Price vs Mileage Scatter Plot (with Zoom & Range Slider) */}
        {activeTab === 'scatter' && (
          <div className="w-full h-full flex flex-col">
            <div className="flex flex-wrap items-center justify-between text-xs px-2 mb-2 text-slate-400 gap-2">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-emerald-400">Great Deal (&gt;8% under avg)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                  <span className="text-sky-400">Fair Price</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span className="text-amber-400">Above Average</span>
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span>Zoom Window: ≤{(mileageZoomMax / 1000).toFixed(0)}k km, ≤{priceZoomMax}L</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-500">({zoomedScatterPoints.length} points visible)</span>
              </div>
            </div>

            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    type="number"
                    dataKey="mileage"
                    name="Mileage"
                    unit=" km"
                    stroke="#64748b"
                    domain={[0, mileageZoomMax]}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="number"
                    dataKey="price_lacs"
                    name="Price"
                    unit=" Lacs"
                    stroke="#64748b"
                    domain={[0, priceZoomMax]}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <ZAxis range={[60, 60]} />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter
                    name="Vehicles"
                    data={zoomedScatterPoints}
                    onClick={(node) => handleDotClick(node)}
                    cursor="pointer"
                  >
                    {zoomedScatterPoints.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. Variants & Trims Share */}
        {activeTab === 'variants' && (
          <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.variant_stats}
                  dataKey="count"
                  nameKey="variant"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
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
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* List breakdown */}
            <div className="space-y-2 overflow-y-auto max-h-72 pr-2 text-xs">
              <h4 className="font-bold text-slate-300 mb-2">Variant Price & Volume Breakdown:</h4>
              {analytics.variant_stats.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="font-semibold text-white">{v.variant}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sky-400 font-bold">{v.avg_price_lacs} Lacs avg</span>
                    <span className="text-slate-400 ml-2">({v.count} cars)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Price Bracket Distribution */}
        {activeTab === 'distribution' && (
          <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.price_distribution} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="range"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val) => [`${val} cars`, 'Inventory']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}
