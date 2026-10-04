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

  // Close DB dropdown when tapping outside
  const dbMenuRef = useRef(null);
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dbMenuRef.current && !dbMenuRef.current.contains(event.target)) {
        setShowDbMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#0A192F]/95 backdrop-blur-md border-b border-[#1A3B6B]/80 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2">
        
        {/* Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#991B1B] via-[#C8232C] to-[#E02832] flex items-center justify-center shadow-lg shadow-red-900/30">
            <Car className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-sm sm:text-lg text-white tracking-tight">PakWheels</span>
              <span className="text-[9px] sm:text-xs px-1.5 py-0.5 rounded-full bg-[#C8232C]/20 text-red-400 font-bold border border-[#C8232C]/40">
                Insights
              </span>
            </div>
            <p className="hidden sm:block text-[10px] text-slate-400 font-medium">Market Intelligence & Analytics</p>
          </div>
        </div>

        {/* Center Navigation Tabs (Dashboard vs Compare) */}
        <nav className="flex items-center bg-[#061021]/80 p-0.5 sm:p-1 rounded-xl border border-[#1A3B6B]/60 shadow-inner">
          <button
            onClick={() => setActiveNavTab('dashboard')}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeNavTab === 'dashboard'
                ? 'bg-gradient-to-r from-[#C8232C] to-[#A81B23] text-white shadow-md shadow-red-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveNavTab('compare')}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeNavTab === 'compare'
                ? 'bg-gradient-to-r from-[#C8232C] to-[#A81B23] text-white shadow-md shadow-red-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Compare</span>
          </button>
        </nav>

        {/* Right stats & actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-300 bg-[#0F2444] px-2.5 py-1.5 rounded-lg border border-[#1C3B66]">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>{totalCatalogMakes || 88} Makes / 690+ Models</span>
          </div>

          {/* Database Backup & Restore Dropdown */}
          <div className="relative" ref={dbMenuRef}>
            <button
              onClick={() => setShowDbMenu(!showDbMenu)}
              className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white bg-[#0F2444] hover:bg-[#16345C] px-2 sm:px-2.5 py-1.5 rounded-lg border border-[#1C3B66] transition shadow-sm"
              title="Database Backup & Sync"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-semibold">DB</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showDbMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0D2342] border border-[#1C3B66] rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95">
                <a
                  href="/api/db/export"
                  download="pakwheels.db"
                  onClick={() => setShowDbMenu(false)}
                  className="flex items-center space-x-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-[#16345C] rounded-xl transition"
                >
                  <Download className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-white">Download Backup</span>
                    <span className="text-[10px] text-slate-400">Save local SQLite copy</span>
                  </div>
                </a>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-[#16345C] rounded-xl transition text-left"
                >
                  <Upload className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-white">{uploading ? 'Uploading...' : 'Upload / Restore DB'}</span>
                    <span className="text-[10px] text-slate-400">Sync fresh listings file</span>
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
            className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-[#0F2444] hover:bg-[#16345C] px-2.5 py-1.5 rounded-lg border border-[#1C3B66] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isSyncing ? 'animate-spin text-red-400' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <a
            href="https://www.pakwheels.com"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center space-x-1 text-xs text-slate-400 hover:text-white transition"
          >
            <span>pakwheels.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </header>
  );
}
