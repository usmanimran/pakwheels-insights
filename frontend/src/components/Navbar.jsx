import React, { useState, useRef } from 'react';
import { Car, BarChart3, Database, RefreshCw, Scale, ExternalLink, Download, Upload, ChevronDown } from 'lucide-react';

export default function Navbar({
  activeNavTab,
  setActiveNavTab,
  onSyncCatalog,
  isSyncing,
  totalCatalogMakes
}) {
  const [showDbMenu, setShowDbMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/db/import', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        alert('Database restored successfully! Refreshing...');
        window.location.reload();
      } else {
        const err = await res.json();
        alert('Upload failed: ' + (err.detail || 'Unknown error'));
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploading(false);
      setShowDbMenu(false);
    }
  };

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

          {/* Database Backup & Restore Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDbMenu(!showDbMenu)}
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
              title="Database Backup & Sync"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">DB Sync</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showDbMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-850 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs">
                <a
                  href="/api/db/export"
                  download="pakwheels.db"
                  onClick={() => setShowDbMenu(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold block">Download DB Backup</span>
                    <span className="text-[10px] text-slate-400">Save current database</span>
                  </div>
                </a>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition text-left"
                >
                  <Upload className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="font-semibold block">{uploading ? 'Uploading...' : 'Upload / Sync DB'}</span>
                    <span className="text-[10px] text-slate-400">Import local pakwheels.db</span>
                  </div>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".db,.sqlite,.sqlite3"
                  className="hidden"
                />
              </div>
            )}
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
