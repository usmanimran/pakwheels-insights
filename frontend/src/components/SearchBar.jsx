import React, { useState, useEffect, useRef } from 'react';
import {
  Search, MapPin, Zap, ChevronDown, Sparkles, Filter,
  CarFront, Sliders, Check, Calendar, Database, RefreshCw, X
} from 'lucide-react';

const PRESETS = [
  { make: 'Suzuki', model: 'Alto', cities: ['Lahore'], variant: 'All Variants' },
  { make: 'Toyota', model: 'Corolla', cities: ['Karachi'], variant: 'All Variants' },
  { make: 'Honda', model: 'Civic', cities: ['Islamabad', 'Rawalpindi'], variant: 'All Variants' },
  { make: 'KIA', model: 'Sportage', cities: ['Lahore'], variant: 'All Variants' },
  { make: 'Suzuki', model: 'Alto', cities: ['Lahore'], variant: 'VXL AGS' },
  { make: 'Suzuki', model: 'Alto', cities: ['Lahore'], variant: 'VXR' },
  { make: 'Changan', model: 'Alsvin', cities: ['Faisalabad'], variant: 'All Variants' },
  { make: 'Hyundai', model: 'Tucson', cities: ['Lahore', 'Islamabad'], variant: 'All Variants' },
];

export default function SearchBar({
  catalog,
  selectedMake,
  setSelectedMake,
  selectedModel,
  setSelectedModel,
  selectedCities,
  setSelectedCities,
  selectedVariant,
  setSelectedVariant,
  availableVariants,
  minYear,
  setMinYear,
  maxYear,
  setMaxYear,
  scanType,
  setScanType,
  onStartScrape,
  isScraping,
  scanStatus
}) {
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef(null);

  // Close city dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setCityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find models for selected make
  const currentMakeData = catalog?.makes?.find(
    (m) => m.make_name.toLowerCase() === (selectedMake || '').toLowerCase()
  );
  const availableModels = currentMakeData?.models || [];

  // Reset or select first model when make changes if model no longer valid
  useEffect(() => {
    if (availableModels.length > 0 && selectedModel !== 'All Models') {
      const exists = availableModels.some(
        (m) => m.model_name.toLowerCase() === selectedModel.toLowerCase()
      );
      if (!exists && selectedModel) {
        setSelectedModel(availableModels[0].model_name);
      }
    }
  }, [selectedMake, availableModels]);

  const handleCityToggle = (cityName) => {
    if (cityName === 'All Pakistan') {
      setSelectedCities(['All Pakistan']);
      return;
    }
    let updated = selectedCities.filter((c) => c !== 'All Pakistan');
    if (updated.includes(cityName)) {
      updated = updated.filter((c) => c !== cityName);
      if (updated.length === 0) updated = ['All Pakistan'];
    } else {
      updated.push(cityName);
    }
    setSelectedCities(updated);
  };

  const handlePresetClick = (preset) => {
    setSelectedMake(preset.make);
    setSelectedModel(preset.model);
    setSelectedCities(preset.cities || ['Lahore']);
    setSelectedVariant(preset.variant || 'All Variants');
    onStartScrape({
      make: preset.make,
      model: preset.model,
      cities: preset.cities || ['Lahore'],
      scan_type: scanType
    });
  };

  const isAllCities = selectedCities.length === 0 || selectedCities.includes('All Pakistan');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative">
      {/* Background Accent glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Row 1: Primary Selectors (Make, Model, Variant, Multi-City, Year Range, Scrape Action) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end relative z-20">
        
        {/* 1. Make */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center space-x-1">
            <CarFront className="w-3.5 h-3.5 text-red-400" />
            <span>Make / Brand</span>
          </label>
          <div className="relative">
            <select
              value={selectedMake}
              onChange={(e) => {
                setSelectedMake(e.target.value);
                setSelectedVariant('All Variants');
              }}
              className="w-full bg-slate-800 text-white font-medium text-xs rounded-xl px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-red-500 transition appearance-none cursor-pointer"
            >
              {catalog?.makes?.map((m) => (
                <option key={m.make_slug} value={m.make_name}>
                  {m.make_name} {m.models_count ? `(${m.models_count})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 2. Model */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span>Car Model</span>
          </label>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setSelectedVariant('All Variants');
              }}
              className="w-full bg-slate-800 text-white font-medium text-xs rounded-xl px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-sky-500 transition appearance-none cursor-pointer"
            >
              <option value="All Models">All {selectedMake} Models</option>
              {availableModels.map((m) => (
                <option key={m.model_slug} value={m.model_name}>
                  {m.model_name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 3. Variant */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center space-x-1">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Trim / Variant</span>
          </label>
          <div className="relative">
            <select
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(e.target.value)}
              className="w-full bg-slate-800 text-white font-medium text-xs rounded-xl px-3 py-2.5 border border-slate-700 focus:outline-none focus:border-amber-500 transition appearance-none cursor-pointer"
            >
              <option value="All Variants">✓ All Variants (Entire Model)</option>
              {availableVariants?.map((v) => (
                <option key={v.variant} value={v.variant}>
                  {v.variant} {v.count ? `(${v.count})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 4. Multi-City Selector */}
        <div ref={cityDropdownRef} className="relative">
          <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cities ({isAllCities ? 'All' : selectedCities.length})</span>
            </span>
          </label>
          
          <button
            type="button"
            onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
            className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2.5 border border-slate-700 flex items-center justify-between text-left hover:border-emerald-500 transition"
          >
            <span className="truncate">
              {isAllCities
                ? 'All Pakistan'
                : selectedCities.join(', ')}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
          </button>

          {/* Multi-City Popover Drawer */}
          {cityDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-white">
                <span>Select Target Cities</span>
                <button
                  type="button"
                  onClick={() => setSelectedCities(['All Pakistan'])}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  All Pakistan
                </button>
              </div>

              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {catalog?.cities?.map((c) => {
                  const isChecked = selectedCities.includes(c.name) || (c.name === 'All Pakistan' && isAllCities);
                  return (
                    <label
                      key={c.slug}
                      className="flex items-center space-x-2 text-xs text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCityToggle(c.name)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-800 cursor-pointer"
                      />
                      <span>{c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 5. Top Year Range Filter (Requested by user) */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Year Range</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="number"
              placeholder="From (2018)"
              value={minYear || ''}
              onChange={(e) => setMinYear(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-slate-800 text-white text-xs rounded-xl px-2.5 py-2.5 border border-slate-700 focus:outline-none focus:border-indigo-500 text-center"
            />
            <input
              type="number"
              placeholder="To (2026)"
              value={maxYear || ''}
              onChange={(e) => setMaxYear(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-slate-800 text-white text-xs rounded-xl px-2.5 py-2.5 border border-slate-700 focus:outline-none focus:border-indigo-500 text-center"
            />
          </div>
        </div>

        {/* 6. Scrape Action Button */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-slate-400">Scrape Scope</span>
            <div className="flex items-center space-x-1 text-[10px]">
              <button
                type="button"
                onClick={() => setScanType('all')}
                className={`px-1.5 py-0.5 rounded transition ${
                  scanType === 'all'
                    ? 'bg-red-500/25 text-red-300 font-bold border border-red-500/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                All Pages
              </button>
              <button
                type="button"
                onClick={() => setScanType('quick')}
                className={`px-1.5 py-0.5 rounded transition ${
                  scanType === 'quick'
                    ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          <button
            onClick={() => onStartScrape()}
            disabled={isScraping}
            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg transition duration-200 ${
              isScraping
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-600/30'
            }`}
          >
            {isScraping ? (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Crawling PakWheels...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Fetch Live Listings</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Row 2: Cache First Status Ribbon (Requested by user) */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <Database className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-300">
            {scanStatus?.has_cached_data ? (
              <>
                Local Database: <strong className="text-white">{scanStatus.count} listings</strong> stored
                <span className="text-slate-500 mx-1.5">•</span>
                Last scanned: <span className="text-emerald-400 font-semibold">{scanStatus.time_ago}</span>
              </>
            ) : (
              <span className="text-slate-400">
                No local listings stored yet. Click <strong>Fetch Live Listings</strong> to crawl.
              </span>
            )}
          </span>
        </div>

        {/* Selected City Chips (if multiple selected) */}
        {!isAllCities && selectedCities.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500">Active Cities:</span>
            {selectedCities.map((city) => (
              <span
                key={city}
                className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center space-x-1"
              >
                <span>{city}</span>
                <button
                  type="button"
                  onClick={() => handleCityToggle(city)}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Popular Preset Shortcuts */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-slate-400 flex items-center space-x-1 mr-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Quick Shortcuts:</span>
        </span>
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handlePresetClick(p)}
            className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center space-x-1"
          >
            <span>{p.make} {p.model}</span>
            {p.variant !== 'All Variants' && (
              <span className="text-amber-400 font-medium">({p.variant})</span>
            )}
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{p.cities.join(', ')}</span>
          </button>
        ))}
      </div>

    </div>
  );
}
