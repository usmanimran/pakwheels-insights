import React from 'react';
import { Car, BarChart3, Database, RefreshCw, Scale, ExternalLink } from 'lucide-react';

export default function Navbar({
  activeNavTab,
  setActiveNavTab,
  onSyncCatalog,
  isSyncing,
  totalCatalogMakes
}) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base sm:text-lg text-white tracking-tight">PakWheels</span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
                Live Insights
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400">Market Intelligence & Analytics</p>
          </div>
        </div>

        {/* Center Navigation Tabs (Dashboard vs Compare) */}
        <nav className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setActiveNavTab('dashboard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeNavTab === 'dashboard'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveNavTab('compare')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeNavTab === 'compare'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Compare</span>
          </button>
        </nav>

        {/* Right stats & actions */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>{totalCatalogMakes || 88} Makes / 690+ Models</span>
          </div>

          <button
            onClick={onSyncCatalog}
            disabled={isSyncing}
            title="Refresh PakWheels vehicle taxonomy"
            className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isSyncing ? 'animate-spin text-red-400' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <a
            href="https://www.pakwheels.com"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <span>pakwheels.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </header>
  );
}
