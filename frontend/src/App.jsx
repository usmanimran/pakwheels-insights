import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SearchBar from './components/SearchBar';
import KpiCards from './components/KpiCards';
import ChartsDashboard from './components/ChartsDashboard';
import FilterSidebar from './components/FilterSidebar';
import ListingCard from './components/ListingCard';
import ListingsTable from './components/ListingsTable';
import ComparePage from './components/ComparePage';
import ScrapeProgressModal from './components/ScrapeProgressModal';
import {
  fetchCatalog,
  syncCatalog,
  fetchVariants,
  fetchListings,
  fetchAnalytics,
  fetchScanStatus,
  getScrapeStreamUrl,
  getExportCsvUrl
} from './services/api';
import { LayoutGrid, List, Download, RefreshCw, Car, ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  // Navigation State ('dashboard' or 'compare')
  const [activeNavTab, setActiveNavTab] = useState('dashboard');

  // Theme State ('light' | 'dark')
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pakwheels_theme') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('pakwheels_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Catalog & Search State
  const [catalog, setCatalog] = useState(null);
  const [selectedMake, setSelectedMake] = useState('Suzuki');
  const [selectedModel, setSelectedModel] = useState('Alto');
  const [selectedVariant, setSelectedVariant] = useState('All Variants');
  const [availableVariants, setAvailableVariants] = useState([]);
  
  // Multi-City Selection
  const [selectedCities, setSelectedCities] = useState(['Lahore']);
  
  // Top Year Range Filters (Requested by user)
  const [minYear, setMinYear] = useState(undefined);
  const [maxYear, setMaxYear] = useState(undefined);

  const [scanType, setScanType] = useState('all'); // 'all' (fetch all listings) or 'quick'
  const [scanStatus, setScanStatus] = useState(null);

  // Scraping Progress State
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState(null);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);

  // Secondary Filters (Price, Mileage, Transmission, Sort)
  const [filters, setFilters] = useState({
    sort_by: 'newest',
    min_price: undefined,
    max_price: undefined,
    min_price_lacs: undefined,
    max_price_lacs: undefined,
    max_mileage: undefined,
    transmission: undefined,
  });

  // Data & View State
  const [listingsData, setListingsData] = useState({ items: [], total: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;

  // 1. Initial Load: Fetch Catalog
  useEffect(() => {
    fetchCatalog()
      .then((data) => {
        setCatalog(data);
      })
      .catch((err) => console.error('Error fetching catalog:', err));
  }, []);

  // 2. Fetch distinct variants whenever Make, Model, or Cities change
  useEffect(() => {
    const loadVariants = async () => {
      try {
        const citiesParam = selectedCities.includes('All Pakistan') ? undefined : selectedCities.join(',');
        const res = await fetchVariants({
          make: selectedMake,
          model: selectedModel === 'All Models' ? undefined : selectedModel,
          cities: citiesParam
        });
        setAvailableVariants(res.variants || []);
      } catch (err) {
        console.error('Error fetching variants:', err);
      }
    };
    loadVariants();
  }, [selectedMake, selectedModel, selectedCities]);

  // 3. Fetch Scan Status & Cache Metadata (Cache First)
  useEffect(() => {
    const loadScanStatus = async () => {
      try {
        const citiesParam = selectedCities.includes('All Pakistan') ? undefined : selectedCities.join(',');
        const res = await fetchScanStatus({
          make: selectedMake,
          model: selectedModel === 'All Models' ? undefined : selectedModel,
          cities: citiesParam
        });
        setScanStatus(res);
      } catch (err) {
        console.error('Error fetching scan status:', err);
      }
    };
    loadScanStatus();
  }, [selectedMake, selectedModel, selectedCities]);

  // 4. Fetch Listings & Analytics from DB Cache
  const refreshData = async (resetPage = false) => {
    setLoadingData(true);
    const currentPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);

    const activeVariant = !selectedVariant || selectedVariant === 'All Variants' ? undefined : selectedVariant;
    const citiesParam = selectedCities.includes('All Pakistan') ? undefined : selectedCities.join(',');

    const queryParams = {
      make: selectedMake,
      model: selectedModel === 'All Models' ? undefined : selectedModel,
      cities: citiesParam,
      variant: activeVariant,
      min_year: minYear,
      max_year: maxYear,
      min_price: filters.min_price,
      max_price: filters.max_price,
      max_mileage: filters.max_mileage,
      transmission: filters.transmission,
      sort_by: filters.sort_by,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    };

    try {
      const [listingsRes, analyticsRes] = await Promise.all([
        fetchListings(queryParams),
        fetchAnalytics(queryParams),
      ]);
      setListingsData(listingsRes);
      setAnalytics(analyticsRes);
    } catch (err) {
      console.error('Error loading listings/analytics:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    refreshData(true);
  }, [selectedMake, selectedModel, selectedVariant, selectedCities, minYear, maxYear, filters]);

  useEffect(() => {
    refreshData(false);
  }, [page]);

  // 5. Start Live Scrape with SSE Progress
  const handleStartScrape = (overrides = {}) => {
    const make = overrides.make || selectedMake;
    const model = overrides.model || selectedModel;
    const cities = overrides.cities || selectedCities;
    const scan = overrides.scan_type || scanType;

    const makeSlug = make.toLowerCase().replace(/\s+/g, '-');
    const modelSlug = model === 'All Models' ? 'all' : model.toLowerCase().replace(/\s+/g, '-');
    
    const isAll = cities.includes('All Pakistan') || cities.length === 0;
    const citySlug = isAll ? 'all' : cities.map((c) => c.toLowerCase().replace(/\s+/g, '-')).join(',');
    const cityName = isAll ? 'All Pakistan' : cities.join(',');

    setIsScraping(true);
    setScrapeProgress({
      status: 'starting',
      current_page: 0,
      total_pages: 1,
      count: 0,
      percent: 5,
      message: `Connecting to PakWheels for ${make} ${model} in ${cityName}...`,
    });

    const streamUrl = getScrapeStreamUrl({
      make_name: make,
      make_slug: makeSlug,
      model_name: model,
      model_slug: modelSlug,
      city_name: cityName,
      city_slug: citySlug,
      scan_type: scan,
    });

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setScrapeProgress(data);

        if (data.status === 'done') {
          eventSource.close();
          setIsScraping(false);
          // Reload scan status, variants and data
          const citiesParam = isAll ? undefined : cities.join(',');
          fetchScanStatus({ make, model, cities: citiesParam }).then(setScanStatus);
          fetchVariants({ make, model, cities: citiesParam }).then((res) => setAvailableVariants(res.variants || []));
          refreshData(true);
        } else if (data.status === 'error') {
          eventSource.close();
          setIsScraping(false);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      eventSource.close();
      setIsScraping(false);
      setScrapeProgress((prev) => ({
        ...prev,
        status: 'error',
        message: 'Scrape finished or connection ended.',
      }));
      refreshData(true);
    };
  };

  const handleResetFilters = () => {
    setSelectedVariant('All Variants');
    setMinYear(undefined);
    setMaxYear(undefined);
    setFilters({
      sort_by: 'newest',
      min_price: undefined,
      max_price: undefined,
      min_price_lacs: undefined,
      max_price_lacs: undefined,
      max_mileage: undefined,
      transmission: undefined,
    });
  };

  const handleSyncCatalog = async () => {
    setIsSyncingCatalog(true);
    try {
      await syncCatalog();
      const updated = await fetchCatalog();
      setCatalog(updated);
    } catch (err) {
      console.error('Failed to sync catalog:', err);
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  const activeVariant = !selectedVariant || selectedVariant === 'All Variants' ? undefined : selectedVariant;
  const citiesParam = selectedCities.includes('All Pakistan') ? undefined : selectedCities.join(',');

  const exportUrl = getExportCsvUrl({
    make: selectedMake,
    model: selectedModel === 'All Models' ? undefined : selectedModel,
    cities: citiesParam,
    variant: activeVariant,
    min_year: minYear,
    max_year: maxYear,
    min_price: filters.min_price,
    max_price: filters.max_price,
    transmission: filters.transmission,
  });

  const totalPages = Math.ceil((listingsData?.total || 0) / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#08162B] flex flex-col text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Header with Navigation Tabs */}
      <Navbar
        activeNavTab={activeNavTab}
        setActiveNavTab={setActiveNavTab}
        onSyncCatalog={handleSyncCatalog}
        isSyncing={isSyncingCatalog}
        totalCatalogMakes={catalog?.makes?.length}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        
        {/* TAB 1: COMPARE PAGE */}
        {activeNavTab === 'compare' ? (
          <ComparePage catalog={catalog} theme={theme} />
        ) : (
          /* TAB 2: MARKET DASHBOARD */
          <div className="space-y-5 sm:space-y-6">
            
            {/* Top Search & Query Bar with Multi-City, Year Range & Cache Status */}
            <SearchBar
              catalog={catalog}
              selectedMake={selectedMake}
              setSelectedMake={setSelectedMake}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              selectedCities={selectedCities}
              setSelectedCities={setSelectedCities}
              selectedVariant={selectedVariant}
              setSelectedVariant={setSelectedVariant}
              availableVariants={availableVariants}
              minYear={minYear}
              setMinYear={setMinYear}
              maxYear={maxYear}
              setMaxYear={setMaxYear}
              scanType={scanType}
              setScanType={setScanType}
              onStartScrape={handleStartScrape}
              isScraping={isScraping}
              scanStatus={scanStatus}
            />

            {/* Top KPI Cards (Mobile friendly 2-col, Desktop 5-col) */}
            <KpiCards analytics={analytics} loading={loadingData} />

            {/* Visual Analytics Dashboard (With Graph Zoom Controls) */}
            <ChartsDashboard analytics={analytics} loading={loadingData} theme={theme} />

            {/* Listings Section: Filters + Grid/Table Explorer */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              
              {/* Left: Collapsible Secondary Filter Sidebar */}
              <div className="lg:col-span-1">
                <FilterSidebar
                  filters={filters}
                  setFilters={setFilters}
                  onResetFilters={handleResetFilters}
                  analytics={analytics}
                  availableVariants={availableVariants}
                  selectedVariant={selectedVariant}
                  setSelectedVariant={setSelectedVariant}
                />
              </div>

              {/* Right: Listings Explorer */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* View Bar & Actions */}
                <div className="bg-white dark:bg-pw-navy-800 border border-slate-200 dark:border-pw-navy-700 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm dark:shadow-xl">
                  
                  <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                    <Car className="w-4 h-4 text-pw-red-500" />
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                      Listings:
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-pw-navy-900 text-pw-blue-600 dark:text-pw-blue-400 font-bold text-xs border border-slate-200 dark:border-pw-navy-700">
                      {listingsData?.total?.toLocaleString() || 0} Cars
                    </span>
                    {selectedVariant && selectedVariant !== 'All Variants' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-500/30 truncate max-w-[140px] sm:max-w-[200px]">
                        {selectedVariant}
                      </span>
                    )}
                    {selectedCities && !selectedCities.includes('All Pakistan') && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/30 truncate max-w-[140px] sm:max-w-[200px]">
                        {selectedCities.join(', ')}
                      </span>
                    )}
                  </div>

                  {/* View Mode Toggle & CSV Export */}
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="flex items-center bg-slate-100 dark:bg-pw-navy-900 rounded-xl p-1 border border-slate-200 dark:border-pw-navy-700">
                      <button
                        onClick={() => setViewMode('cards')}
                        className={`p-1.5 rounded-lg transition ${
                          viewMode === 'cards' ? 'bg-pw-red-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Grid Cards View"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`p-1.5 rounded-lg transition ${
                          viewMode === 'table' ? 'bg-pw-red-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Table View"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>

                    <a
                      href={exportUrl}
                      download
                      className="flex items-center space-x-1.5 text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-600/20 hover:bg-emerald-500/20 dark:hover:bg-emerald-600/30 active:scale-95 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </a>
                  </div>

                </div>

                {/* Listings Content */}
                {loadingData ? (
                  <div className="bg-white dark:bg-pw-navy-800 border border-slate-200 dark:border-pw-navy-700 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center space-y-3 shadow-sm dark:shadow-xl">
                    <RefreshCw className="w-6 h-6 animate-spin text-pw-red-500" />
                    <span className="text-sm">Updating market data and filters...</span>
                  </div>
                ) : listingsData?.items?.length === 0 ? (
                  <div className="bg-white dark:bg-pw-navy-800 border border-slate-200 dark:border-pw-navy-700 rounded-2xl p-8 sm:p-12 text-center text-slate-500 dark:text-slate-400 space-y-3 shadow-sm dark:shadow-xl">
                    <p className="text-base font-bold text-slate-900 dark:text-white">No listings match the current filters.</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Adjust your filters or click below to crawl fresh live listings from PakWheels.
                    </p>
                    <button
                      onClick={() => handleStartScrape()}
                      className="mt-2 px-4 py-2 bg-pw-red-600 hover:bg-pw-red-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-pw-red-600/25"
                    >
                      Fetch All {selectedMake} {selectedModel} in {selectedCities.join(', ')}
                    </button>
                  </div>
                ) : viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {listingsData.items.map((listing) => (
                      <ListingCard key={listing.pakwheels_id || listing.id} listing={listing} />
                    ))}
                  </div>
                ) : (
                  <ListingsTable listings={listingsData.items} />
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="bg-white dark:bg-pw-navy-800 border border-slate-200 dark:border-pw-navy-700 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 shadow-sm dark:shadow-xl">
                    <span>
                      Page <strong className="text-slate-900 dark:text-white">{page}</strong> of <strong className="text-slate-900 dark:text-white">{totalPages}</strong>
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-pw-navy-900 text-slate-700 dark:text-white border border-slate-200 dark:border-pw-navy-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-pw-navy-700 transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <span className="px-3 py-1 font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-pw-navy-900 border border-slate-200 dark:border-pw-navy-700 rounded-xl">
                        {page}
                      </span>

                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-pw-navy-900 text-slate-700 dark:text-white border border-slate-200 dark:border-pw-navy-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-pw-navy-700 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Real-time Scraping Progress Modal */}
      <ScrapeProgressModal
        progress={scrapeProgress}
        onClose={() => setScrapeProgress(null)}
        onRetry={() => handleStartScrape(selectedMake, selectedModel, selectedCities, scanType)}
      />

    </div>
  );
}
