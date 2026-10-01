import React, { useState } from 'react';
import { SlidersHorizontal, RotateCcw, ArrowUpDown, DollarSign, Gauge, Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function FilterSidebar({
  filters,
  setFilters,
  onResetFilters,
  analytics,
  availableVariants,
  selectedVariant,
  setSelectedVariant
}) {
  const [collapsedMobile, setCollapsedMobile] = useState(false);

  const handleChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  const isAllVariants = !selectedVariant || selectedVariant === 'All Variants';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-5">
      
      {/* Title & Reset (with mobile toggle) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-white font-bold text-sm">
          <SlidersHorizontal className="w-4 h-4 text-red-400" />
          <span>Filters & Sort</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onResetFilters}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white transition"
            title="Reset filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={() => setCollapsedMobile(!collapsedMobile)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            {collapsedMobile ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className={`${collapsedMobile ? 'hidden lg:block' : 'block'} space-y-5`}>
        {/* Sort Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center space-x-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
            <span>Sort Listings By</span>
          </label>
          <select
            value={filters.sort_by || 'newest'}
            onChange={(e) => handleChange('sort_by', e.target.value)}
            className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-red-500 transition cursor-pointer"
          >
            <option value="newest">Recently Scraped / Newest</option>
            <option value="price_asc">Price: Lowest First</option>
            <option value="price_desc">Price: Highest First</option>
            <option value="year_desc">Year: Newest Model (2024 → 2000)</option>
            <option value="year_asc">Year: Oldest Model (2000 → 2024)</option>
            <option value="mileage_asc">Mileage: Lowest Driven</option>
            <option value="mileage_desc">Mileage: Highest Driven</option>
          </select>
        </div>

        {/* Price Range (Lacs) */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center space-x-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Price Range (in PKR Lacs)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.5"
              placeholder="Min Lacs"
              value={filters.min_price_lacs || ''}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('min_price_lacs', val);
                handleChange('min_price', val ? Number(val) * 100000 : '');
              }}
              className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="number"
              step="0.5"
              placeholder="Max Lacs"
              value={filters.max_price_lacs || ''}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('max_price_lacs', val);
                handleChange('max_price', val ? Number(val) * 100000 : '');
              }}
              className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Mileage Range */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center space-x-1">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>Max Mileage (km)</span>
          </label>
          <input
            type="number"
            step="5000"
            placeholder="Max km (e.g. 80000)"
            value={filters.max_mileage || ''}
            onChange={(e) => handleChange('max_mileage', e.target.value ? Number(e.target.value) : '')}
            className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Transmission Pills */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">
            Transmission Type
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {['all', 'automatic', 'manual'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleChange('transmission', t === 'all' ? undefined : t)}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize transition ${
                  (filters.transmission || 'all').toLowerCase() === t
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Variant / Trim Pills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300">
              Variant Quick Toggle
            </label>
            <span className="text-[10px] text-slate-500">
              {isAllVariants ? 'All' : selectedVariant}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => setSelectedVariant('All Variants')}
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                isAllVariants
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              {isAllVariants && <Check className="w-3 h-3 text-amber-400" />}
              <span>All Trims</span>
            </button>

            {availableVariants && availableVariants.slice(0, 10).map((v) => {
              const isSelected = selectedVariant?.toLowerCase() === v.variant.toLowerCase();
              return (
                <button
                  key={v.variant}
                  type="button"
                  onClick={() => setSelectedVariant(isSelected ? 'All Variants' : v.variant)}
                  className={`px-2 py-0.5 rounded-lg text-xs transition flex items-center space-x-1 ${
                    isSelected
                      ? 'bg-sky-500/25 text-sky-300 border border-sky-500/50 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-sky-400" />}
                  <span>{v.variant}</span>
                  {v.count && (
                    <span className="text-[10px] text-slate-500 ml-1">({v.count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
