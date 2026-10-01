import React, { useState, useEffect } from 'react';
import { fetchCompare, fetchVariants } from '../services/api';
import {
  Scale, ArrowRightLeft, TrendingUp, TrendingDown, Gauge,
  CarFront, MapPin, Sliders, Calendar, DollarSign, RefreshCw,
  Globe, Sparkles, XCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export default function ComparePage({ catalog }) {
  // Segment / Vehicle A State
  const [makeA, setMakeA] = useState('All Makes');
  const [modelA, setModelA] = useState('All Models');
  const [variantA, setVariantA] = useState('All Variants');
  const [cityA, setCityA] = useState('All Pakistan');
  const [minYearA, setMinYearA] = useState('2015');
  const [maxYearA, setMaxYearA] = useState('2019');
  const [variantsListA, setVariantsListA] = useState([]);

  // Segment / Vehicle B State
  const [makeB, setMakeB] = useState('All Makes');
  const [modelB, setModelB] = useState('All Models');
  const [variantB, setVariantB] = useState('All Variants');
  const [cityB, setCityB] = useState('All Pakistan');
  const [minYearB, setMinYearB] = useState('2020');
  const [maxYearB, setMaxYearB] = useState('2025');
  const [variantsListB, setVariantsListB] = useState([]);

  // Comparison Results
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load variants for A when specific make & model chosen
  useEffect(() => {
    if (makeA !== 'All Makes' && modelA !== 'All Models') {
      fetchVariants({ make: makeA, model: modelA }).then((res) => {
        setVariantsListA(res.variants || []);
      });
    } else {
      setVariantsListA([]);
    }
  }, [makeA, modelA]);

  // Load variants for B when specific make & model chosen
  useEffect(() => {
    if (makeB !== 'All Makes' && modelB !== 'All Models') {
      fetchVariants({ make: makeB, model: modelB }).then((res) => {
        setVariantsListB(res.variants || []);
      });
    } else {
      setVariantsListB([]);
    }
  }, [makeB, modelB]);

  // Trigger comparison
  const runComparison = async (overrideParams = {}) => {
    setLoading(true);
    try {
      const mA = overrideParams.makeA !== undefined ? overrideParams.makeA : makeA;
      const moA = overrideParams.modelA !== undefined ? overrideParams.modelA : modelA;
      const vA = overrideParams.variantA !== undefined ? overrideParams.variantA : variantA;
      const cA = overrideParams.cityA !== undefined ? overrideParams.cityA : cityA;
      const minY_A = overrideParams.minYearA !== undefined ? overrideParams.minYearA : minYearA;
      const maxY_A = overrideParams.maxYearA !== undefined ? overrideParams.maxYearA : maxYearA;

      const mB = overrideParams.makeB !== undefined ? overrideParams.makeB : makeB;
      const moB = overrideParams.modelB !== undefined ? overrideParams.modelB : modelB;
      const vB = overrideParams.variantB !== undefined ? overrideParams.variantB : variantB;
      const cB = overrideParams.cityB !== undefined ? overrideParams.cityB : cityB;
      const minY_B = overrideParams.minYearB !== undefined ? overrideParams.minYearB : minYearB;
      const maxY_B = overrideParams.maxYearB !== undefined ? overrideParams.maxYearB : maxYearB;

      const res = await fetchCompare({
        make_a: mA === 'All Makes' ? undefined : mA,
        model_a: moA === 'All Models' ? undefined : moA,
        variant_a: vA === 'All Variants' ? undefined : vA,
        cities_a: cA === 'All Pakistan' ? undefined : cA,
        min_year_a: minY_A ? parseInt(minY_A) : undefined,
        max_year_a: maxY_A ? parseInt(maxY_A) : undefined,

        make_b: mB === 'All Makes' ? undefined : mB,
        model_b: moB === 'All Models' ? undefined : moB,
        variant_b: vB === 'All Variants' ? undefined : vB,
        cities_b: cB === 'All Pakistan' ? undefined : cB,
        min_year_b: minY_B ? parseInt(minY_B) : undefined,
        max_year_b: maxY_B ? parseInt(maxY_B) : undefined,
      });
      setComparisonData(res);
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    runComparison();
  }, []);

  const modelsForMakeA = catalog?.makes?.find((m) => m.make_name.toLowerCase() === makeA.toLowerCase())?.models || [];
  const modelsForMakeB = catalog?.makes?.find((m) => m.make_name.toLowerCase() === makeB.toLowerCase())?.models || [];

  // Quick preset helper
  const applyPreset = (preset) => {
    if (preset === 'eras') {
      setMakeA('All Makes');
      setModelA('All Models');
      setVariantA('All Variants');
      setCityA('All Pakistan');
      setMinYearA('2015');
      setMaxYearA('2019');

      setMakeB('All Makes');
      setModelB('All Models');
      setVariantB('All Variants');
      setCityB('All Pakistan');
      setMinYearB('2020');
      setMaxYearB('2025');

      runComparison({
        makeA: 'All Makes', modelA: 'All Models', variantA: 'All Variants', cityA: 'All Pakistan', minYearA: '2015', maxYearA: '2019',
        makeB: 'All Makes', modelB: 'All Models', variantB: 'All Variants', cityB: 'All Pakistan', minYearB: '2020', maxYearB: '2025'
      });
    } else if (preset === 'cities') {
      setMakeA('All Makes');
      setModelA('All Models');
      setVariantA('All Variants');
      setCityA('Lahore');
      setMinYearA('');
      setMaxYearA('');

      setMakeB('All Makes');
      setModelB('All Models');
      setVariantB('All Variants');
      setCityB('Karachi');
      setMinYearB('');
      setMaxYearB('');

      runComparison({
        makeA: 'All Makes', modelA: 'All Models', variantA: 'All Variants', cityA: 'Lahore', minYearA: '', maxYearA: '',
        makeB: 'All Makes', modelB: 'All Models', variantB: 'All Variants', cityB: 'Karachi', minYearB: '', maxYearB: ''
      });
    } else if (preset === 'brands') {
      setMakeA('Toyota');
      setModelA('All Models');
      setVariantA('All Variants');
      setCityA('All Pakistan');
      setMinYearA('2018');
      setMaxYearA('2024');

      setMakeB('Honda');
      setModelB('All Models');
      setVariantB('All Variants');
      setCityB('All Pakistan');
      setMinYearB('2018');
      setMaxYearB('2024');

      runComparison({
        makeA: 'Toyota', modelA: 'All Models', variantA: 'All Variants', cityA: 'All Pakistan', minYearA: '2018', maxYearA: '2024',
        makeB: 'Honda', modelB: 'All Models', variantB: 'All Variants', cityB: 'All Pakistan', minYearB: '2018', maxYearB: '2024'
      });
    } else if (preset === 'alto') {
      setMakeA('Suzuki');
      setModelA('Alto');
      setVariantA('VXL AGS');
      setCityA('Lahore');
      setMinYearA('');
      setMaxYearA('');

      setMakeB('Suzuki');
      setModelB('Alto');
      setVariantB('VXR');
      setCityB('Lahore');
      setMinYearB('');
      setMaxYearB('');

      runComparison({
        makeA: 'Suzuki', modelA: 'Alto', variantA: 'VXL AGS', cityA: 'Lahore', minYearA: '', maxYearA: '',
        makeB: 'Suzuki', modelB: 'Alto', variantB: 'VXR', cityB: 'Lahore', minYearB: '', maxYearB: ''
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title Banner & Presets */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Scale className="w-4 h-4" />
              <span>Head-to-Head Market & Segment Benchmark</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Compare Markets, Year Eras, or Vehicles
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Compare the entire used car market across different year brackets (e.g. 2015–2019 vs 2020–2025), compare whole cities, makes, or specific car trims side-by-side.
            </p>
          </div>

          <button
            onClick={() => runComparison()}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition disabled:opacity-50 self-start lg:self-auto"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Comparing...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                <span>Run Comparison</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2 relative z-10 text-xs">
          <span className="text-slate-400 font-semibold flex items-center space-x-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Market Presets:</span>
          </span>
          <button
            onClick={() => applyPreset('eras')}
            className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-medium transition flex items-center space-x-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Whole Market (2015–19 vs 2020–25)</span>
          </button>
          <button
            onClick={() => applyPreset('cities')}
            className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-medium transition flex items-center space-x-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Whole Market (Lahore vs Karachi)</span>
          </button>
          <button
            onClick={() => applyPreset('brands')}
            className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-medium transition flex items-center space-x-1.5"
          >
            <CarFront className="w-3.5 h-3.5 text-sky-400" />
            <span>Brand Rivalry (Toyota vs Honda)</span>
          </button>
          <button
            onClick={() => applyPreset('alto')}
            className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-medium transition flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            <span>Alto Trims (VXL AGS vs VXR)</span>
          </button>
        </div>
      </div>

      {/* Selectors: Column A vs Column B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Config A */}
        <div className="bg-slate-900 border border-sky-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <span className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Segment / Market A</span>
            </span>
            <span className="text-xs text-slate-400 font-semibold truncate max-w-[200px]">
              {makeA === 'All Makes' ? 'Whole Market' : `${makeA} ${modelA}`}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Make / Scope</label>
                <select
                  value={makeA}
                  onChange={(e) => {
                    setMakeA(e.target.value);
                    if (e.target.value === 'All Makes') {
                      setModelA('All Models');
                      setVariantA('All Variants');
                    }
                  }}
                  className="w-full bg-slate-800 text-white rounded-xl px-2.5 py-2 border border-slate-700 text-xs focus:ring-1 focus:ring-sky-500"
                >
                  <option value="All Makes">✓ Whole Market (All Makes)</option>
                  {catalog?.makes?.map((m) => (
                    <option key={m.make_slug} value={m.make_name}>{m.make_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Model</label>
                <select
                  value={modelA}
                  disabled={makeA === 'All Makes'}
                  onChange={(e) => {
                    setModelA(e.target.value);
                    setVariantA('All Variants');
                  }}
                  className="w-full bg-slate-800 text-white rounded-xl px-2.5 py-2 border border-slate-700 text-xs disabled:opacity-40 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="All Models">All Models</option>
                  {modelsForMakeA.map((m) => (
                    <option key={m.model_slug} value={m.model_name}>{m.model_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Trim / Variant</label>
                <select
                  value={variantA}
                  disabled={makeA === 'All Makes' || modelA === 'All Models'}
                  onChange={(e) => setVariantA(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-2.5 py-2 border border-slate-700 text-xs disabled:opacity-40 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="All Variants">All Variants</option>
                  {variantsListA.map((v) => (
                    <option key={v.variant} value={v.variant}>{v.variant}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">City / Region</label>
                <select
                  value={cityA}
                  onChange={(e) => setCityA(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-2.5 py-2 border border-slate-700 text-xs focus:ring-1 focus:ring-sky-500"
                >
                  <option value="All Pakistan">All Pakistan</option>
                  {catalog?.cities?.map((c) => (
                    <option key={c.slug} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year Range Filter for Side A */}
            <div className="pt-2 border-t border-slate-800">
              <label className="text-[11px] text-slate-400 font-medium flex items-center space-x-1 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Model Year Range (Option A)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Year (e.g. 2015)"
                  value={minYearA}
                  onChange={(e) => setMinYearA(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-3 py-1.5 border border-slate-700 text-xs focus:ring-1 focus:ring-sky-500"
                />
                <input
                  type="number"
                  placeholder="Max Year (e.g. 2019)"
                  value={maxYearA}
                  onChange={(e) => setMaxYearA(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-3 py-1.5 border border-slate-700 text-xs focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => { setMinYearA('2015'); setMaxYearA('2019'); }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                >
                  2015–19
                </button>
                <button
                  type="button"
                  onClick={() => { setMinYearA('2020'); setMaxYearA('2025'); }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                >
                  2020–25
                </button>
                <button
                  type="button"
                  onClick={() => { setMinYearA(''); setMaxYearA(''); }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 border border-slate-700"
                >
                  All Years
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Config B */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Segment / Market B</span>
            </span>
            <span className="text-xs text-slate-400 font-semibold truncate max-w-[200px]">
              {makeB === 'All Makes' ? 'Whole Market' : `${makeB} ${modelB}`}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Make / Scope</label>
                <select
                  value={makeB}
                  onChange={(e) => {
                    setMakeB(e.target.value);
                    if (e.target.value === 'All Makes') {
                      setModelB('All Models');
                      setVariantB('All Variants');
                    }
                  }}
                  className="w-full bg-slate-800 text-white rounded-xl px-2.5 py-2 border border-slate-700 text-xs focus:ring-1 focus:ring-amber-500"
                >
                  <option value="All Makes">✓ Whole Market (All Makes)</option>
                  {catalog?.makes?.map((m) => (
                    <option key={m.make_slug} value={m.make_name}>{m.make_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Model</label>
                <select
                  value={modelB}
                  disabled={makeB === 'All Makes'}
                  onChange={(e) => {
                    setModelB(e.target.value);
                    setVariantB('All Variants');
                  }}
                  className="w-full bg-slate-800 text-white rounded-xl px-2.5 py-2 border border-slate-700 text-xs disabled:opacity-40 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="All Models">All Models</option>
                  {modelsForMakeB.map((m) => (
                    <option key={m.model_slug} value={m.model_name}>{m.model_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Trim / Variant</label>
                <select
                  value={variantB}
                  disabled={makeB === 'All Makes' || modelB === 'All Models'}
                  onChange={(e) => setVariantB(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-2.5 py-2 border border-slate-700 text-xs disabled:opacity-40 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="All Variants">All Variants</option>
                  {variantsListB.map((v) => (
                    <option key={v.variant} value={v.variant}>{v.variant}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">City / Region</label>
                <select
                  value={cityB}
                  onChange={(e) => setCityB(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-2.5 py-2 border border-slate-700 text-xs focus:ring-1 focus:ring-amber-500"
                >
                  <option value="All Pakistan">All Pakistan</option>
                  {catalog?.cities?.map((c) => (
                    <option key={c.slug} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year Range Filter for Side B */}
            <div className="pt-2 border-t border-slate-800">
              <label className="text-[11px] text-slate-400 font-medium flex items-center space-x-1 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Model Year Range (Option B)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Year (e.g. 2020)"
                  value={minYearB}
                  onChange={(e) => setMinYearB(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-3 py-1.5 border border-slate-700 text-xs focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="number"
                  placeholder="Max Year (e.g. 2025)"
                  value={maxYearB}
                  onChange={(e) => setMaxYearB(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl px-3 py-1.5 border border-slate-700 text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center space-x-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => { setMinYearB('2015'); setMaxYearB('2019'); }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                >
                  2015–19
                </button>
                <button
                  type="button"
                  onClick={() => { setMinYearB('2020'); setMaxYearB('2025'); }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                >
                  2020–25
                </button>
                <button
                  type="button"
                  onClick={() => { setMinYearB(''); setMaxYearB(''); }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 border border-slate-700"
                >
                  All Years
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Comparison Results Dashboard */}
      {comparisonData && (
        comparisonData.car_a?.analytics?.total_listings === 0 && comparisonData.car_b?.analytics?.total_listings === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-3 shadow-xl">
            <p className="text-base font-bold text-white">No listings currently in database for this comparison.</p>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Comparing <strong>{comparisonData.car_a?.title}</strong> vs <strong>{comparisonData.car_b?.title}</strong>.
              <br />
              Switch to the <strong>Market Intelligence</strong> tab to fetch live listings from PakWheels, or choose different filters.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Delta Highlights Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              
              {/* Price Delta */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <span className="text-xs text-slate-400 block mb-1">Average Price Difference</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xl sm:text-2xl font-black text-white">
                    {Math.abs(comparisonData.comparison?.price_diff_lacs || 0)} Lacs
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold flex items-center space-x-0.5 ${
                    (comparisonData.comparison?.price_diff_pkr || 0) > 0
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {(comparisonData.comparison?.price_diff_pkr || 0) > 0 ? (
                      <><span>Option B is +</span>{comparisonData.comparison?.price_diff_pct}%</>
                    ) : (
                      <><span>Option B is </span>{comparisonData.comparison?.price_diff_pct}%</>
                    )}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-1 truncate" title={`${comparisonData.car_a?.analytics?.formatted_avg_price} vs ${comparisonData.car_b?.analytics?.formatted_avg_price}`}>
                  {comparisonData.car_a?.analytics?.formatted_avg_price} vs {comparisonData.car_b?.analytics?.formatted_avg_price}
                </span>
              </div>

              {/* Mileage Delta */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <span className="text-xs text-slate-400 block mb-1">Average Mileage Difference</span>
                <div className="text-xl sm:text-2xl font-black text-white">
                  {Math.abs(comparisonData.comparison?.mileage_diff_km || 0).toLocaleString()} km
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  {(comparisonData.comparison?.mileage_diff_km || 0) > 0 ? 'Option B is higher driven' : 'Option A is higher driven'}
                </span>
              </div>

              {/* Market Inventory Ratio */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <span className="text-xs text-slate-400 block mb-1">Sample Size Comparison</span>
                <div className="text-xl sm:text-2xl font-black text-white">
                  {comparisonData.car_a?.analytics?.total_listings || 0} vs {comparisonData.car_b?.analytics?.total_listings || 0} cars
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Total listings analyzed in each sample
                </span>
              </div>

            </div>

            {/* Side-by-Side Yearly Comparison Overlay Chart */}
            {comparisonData.comparison?.year_comparison?.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
                  <h3 className="font-extrabold text-sm text-white flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-red-400" />
                    <span>Year-by-Year Price Trajectory</span>
                  </h3>
                  <div className="flex items-center space-x-4 text-xs font-semibold">
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                      <span className="text-sky-400 truncate max-w-[200px]" title={comparisonData.car_a?.title}>{comparisonData.car_a?.title}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                      <span className="text-amber-400 truncate max-w-[200px]" title={comparisonData.car_b?.title}>{comparisonData.car_b?.title}</span>
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData.comparison.year_comparison} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="year" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v}L`} />
                      <Tooltip
                        formatter={(val, name) => [
                          val ? `${val} Lacs` : 'No data',
                          name === 'avg_price_a' ? comparisonData.car_a?.title : comparisonData.car_b?.title
                        ]}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      />
                      <Bar dataKey="avg_price_a" name="avg_price_a" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avg_price_b" name="avg_price_b" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Metric Comparison Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700/60">
                    <tr>
                      <th className="py-3 px-4">Metric</th>
                      <th className="py-3 px-4 text-sky-400">{comparisonData.car_a?.title}</th>
                      <th className="py-3 px-4 text-amber-400">{comparisonData.car_b?.title}</th>
                      <th className="py-3 px-4 text-right">Advantage / Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">Average Market Price</td>
                      <td className="py-3 px-4 font-bold text-sky-400">{comparisonData.car_a?.analytics?.formatted_avg_price}</td>
                      <td className="py-3 px-4 font-bold text-amber-400">{comparisonData.car_b?.analytics?.formatted_avg_price}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {comparisonData.comparison?.price_diff_lacs > 0
                          ? `Option A is ${Math.abs(comparisonData.comparison.price_diff_lacs)}L cheaper`
                          : comparisonData.comparison?.price_diff_lacs < 0
                          ? `Option B is ${Math.abs(comparisonData.comparison.price_diff_lacs)}L cheaper`
                          : 'Even'}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">Median Price</td>
                      <td className="py-3 px-4">{comparisonData.car_a?.analytics?.formatted_median_price}</td>
                      <td className="py-3 px-4">{comparisonData.car_b?.analytics?.formatted_median_price}</td>
                      <td className="py-3 px-4 text-right text-slate-400">Typical market baseline</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">Lowest Entry Price</td>
                      <td className="py-3 px-4">{comparisonData.car_a?.analytics?.formatted_min_price}</td>
                      <td className="py-3 px-4">{comparisonData.car_b?.analytics?.formatted_min_price}</td>
                      <td className="py-3 px-4 text-right text-slate-400">Minimum budget required</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">Highest Price (Top Tier)</td>
                      <td className="py-3 px-4">{comparisonData.car_a?.analytics?.formatted_max_price}</td>
                      <td className="py-3 px-4">{comparisonData.car_b?.analytics?.formatted_max_price}</td>
                      <td className="py-3 px-4 text-right text-slate-400">Top-end / brand new</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">Average Mileage</td>
                      <td className="py-3 px-4">{comparisonData.car_a?.analytics?.avg_mileage?.toLocaleString()} km</td>
                      <td className="py-3 px-4">{comparisonData.car_b?.analytics?.avg_mileage?.toLocaleString()} km</td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {Math.abs(comparisonData.comparison?.mileage_diff_km || 0).toLocaleString()} km difference
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">Total Sample Size</td>
                      <td className="py-3 px-4 font-bold text-sky-400">{comparisonData.car_a?.analytics?.total_listings || 0} listings</td>
                      <td className="py-3 px-4 font-bold text-amber-400">{comparisonData.car_b?.analytics?.total_listings || 0} listings</td>
                      <td className="py-3 px-4 text-right text-slate-400">Market availability</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )
      )}

    </div>
  );
}
