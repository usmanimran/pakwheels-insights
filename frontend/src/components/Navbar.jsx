import React, { useState, useRef, useEffect } from 'react';
import {
  Car, BarChart3, Database, RefreshCw, Scale, ExternalLink,
  Download, Upload, ChevronDown, Sun, Moon, Globe, Check, AlertCircle, X
} from 'lucide-react';
import { fetchProxySettings, saveProxySettings, testProxySettings } from '../services/api';

export default function Navbar({
  activeNavTab,
  setActiveNavTab,
  onSyncCatalog,
  isSyncing,
  totalCatalogMakes,
  theme = 'dark',
  toggleTheme,
}) {
  const [showDbMenu, setShowDbMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Scraper Proxy Modal State
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [proxyInput, setProxyInput] = useState('');
  const [proxyStatus, setProxyStatus] = useState(null);
  const [savingProxy, setSavingProxy] = useState(false);

  useEffect(() => {
    if (showProxyModal) {
      fetchProxySettings()
        .then((res) => {
          if (res?.proxy) setProxyInput(res.proxy);
        })
        .catch(() => {});
    }
  }, [showProxyModal]);

  const handleTestProxy = async () => {
    if (!proxyInput.trim()) {
      setProxyStatus({ type: 'error', message: 'Please enter a proxy URL first' });
      return;
    }
    setProxyStatus({ type: 'testing', message: 'Testing connection to PakWheels...' });
    try {
      const res = await testProxySettings(proxyInput.trim());
      if (res.status === 'ok') {
        setProxyStatus({ type: 'success', message: res.message });
      } else {
        setProxyStatus({ type: 'error', message: res.message });
      }
    } catch (err) {
      setProxyStatus({ type: 'error', message: err.message || 'Proxy test failed' });
    }
  };

  const handleSaveProxy = async () => {
    setSavingProxy(true);
    try {
      await saveProxySettings(proxyInput.trim());
      setProxyStatus({ type: 'success', message: 'Proxy configuration saved!' });
    } catch (err) {
      setProxyStatus({ type: 'error', message: err.message || 'Failed to save proxy' });
    } finally {
      setSavingProxy(false);
    }
  };

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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0A192F]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#1A3B6B]/80 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#991B1B] via-[#C8232C] to-[#E02832] flex items-center justify-center shadow-md shadow-red-900/20">
            <Car className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <span className="font-black text-sm sm:text-lg text-slate-900 dark:text-white tracking-tight">PakWheels</span>
              <span className="text-[9px] sm:text-xs px-1.5 py-0.5 rounded-full bg-[#C8232C]/10 dark:bg-[#C8232C]/20 text-[#C8232C] dark:text-red-400 font-bold border border-[#C8232C]/30 dark:border-[#C8232C]/40">
                Insights
              </span>
            </div>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Market Intelligence & Analytics</p>
          </div>
        </div>

        {/* Center Navigation Tabs (Dashboard vs Compare) */}
        <nav className="flex items-center bg-slate-100 dark:bg-[#061021]/80 p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-[#1A3B6B]/60 shadow-inner">
          <button
            onClick={() => setActiveNavTab('dashboard')}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeNavTab === 'dashboard'
                ? 'bg-gradient-to-r from-[#C8232C] to-[#A81B23] text-white shadow-md shadow-red-900/25'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveNavTab('compare')}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeNavTab === 'compare'
                ? 'bg-gradient-to-r from-[#C8232C] to-[#A81B23] text-white shadow-md shadow-red-900/25'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Compare</span>
          </button>
        </nav>

        {/* Right stats, Theme Toggle & DB actions */}
        <div className="flex items-center space-x-1 sm:space-x-2.5">
          
          {/* Makes / Models Count */}
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#0F2444] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1C3B66]">
            <Database className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span>{totalCatalogMakes || 88} Makes / 690+ Models</span>
          </div>

          {/* Theme Switcher Toggle (Light / Dark) */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-[#1C3B66] bg-slate-100 hover:bg-slate-200 dark:bg-[#0F2444] dark:hover:bg-[#16345C] text-slate-700 dark:text-amber-400 transition flex items-center space-x-1 shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
            <span className="hidden md:inline text-xs font-bold">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </span>
          </button>

          {/* Database Backup & Restore Dropdown */}
          <div className="relative" ref={dbMenuRef}>
            <button
              onClick={() => setShowDbMenu(!showDbMenu)}
              className="flex items-center space-x-1 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#0F2444] dark:hover:bg-[#16345C] px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1C3B66] transition shadow-sm"
              title="Database Backup & Sync"
            >
              <Database className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="hidden sm:inline font-semibold">DB</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showDbMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0D2342] border border-slate-200 dark:border-[#1C3B66] rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95">
                <a
                  href="/api/db/export"
                  download="pakwheels.db"
                  onClick={() => setShowDbMenu(false)}
                  className="flex items-center space-x-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#16345C] rounded-xl transition"
                >
                  <Download className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-slate-900 dark:text-white">Download Backup</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Save local SQLite copy</span>
                  </div>
                </a>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#16345C] rounded-xl transition text-left"
                >
                  <Upload className="w-4 h-4 text-sky-500 dark:text-sky-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-slate-900 dark:text-white">{uploading ? 'Uploading...' : 'Upload / Restore DB'}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Sync fresh listings file</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowDbMenu(false);
                    setShowProxyModal(true);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#16345C] rounded-xl transition text-left"
                >
                  <Globe className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-slate-900 dark:text-white">Scraper Proxy</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Configure Cloudflare proxy</span>
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
            className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#0F2444] dark:hover:bg-[#16345C] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#1C3B66] transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${isSyncing ? 'animate-spin text-red-500' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <a
            href="https://www.pakwheels.com"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400 hover:text-[#C8232C] dark:hover:text-white transition"
          >
            <span>pakwheels.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>

      {/* Standalone Scraper Proxy Modal */}
      {showProxyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowProxyModal(false)}
        >
          <div
            className="bg-white dark:bg-[#0D2342] border border-slate-200 dark:border-[#1C3B66] rounded-3xl max-w-md w-full p-5 shadow-2xl relative text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-[#1A3B6B]">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">Scraper Proxy Settings</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Bypass Cloudflare blocks on cloud hosts</p>
                </div>
              </div>
              <button
                onClick={() => setShowProxyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#112646] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                If scraping fails on Railway with HTTP 403, enter a residential or datacenter proxy below.
              </p>

              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Proxy URL (HTTP / HTTPS / SOCKS5):
                </label>
                <input
                  type="text"
                  value={proxyInput}
                  onChange={(e) => setProxyInput(e.target.value)}
                  placeholder="http://user:pass@proxy.example.com:8080"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#112646] border border-slate-300 dark:border-[#1C3B66] text-slate-900 dark:text-white font-mono placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              {proxyStatus && (
                <div className={`text-[10px] p-2 rounded-xl border flex items-center space-x-1.5 ${
                  proxyStatus.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : proxyStatus.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    : 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300'
                }`}>
                  {proxyStatus.type === 'success' && <Check className="w-3 h-3 flex-shrink-0" />}
                  {proxyStatus.type === 'error' && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                  <span>{proxyStatus.message}</span>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestProxy}
                  disabled={proxyStatus?.type === 'testing'}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#112646] dark:hover:bg-[#1C3B66] text-slate-800 dark:text-white transition flex items-center space-x-1"
                >
                  {proxyStatus?.type === 'testing' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span>Test Connection</span>}
                </button>
                <button
                  type="button"
                  onClick={handleSaveProxy}
                  disabled={savingProxy}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
                >
                  {savingProxy ? 'Saving...' : 'Save Proxy'}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-[#1A3B6B] flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>Need a free proxy?</span>
                <a
                  href="https://www.webshare.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 dark:text-sky-400 font-bold hover:underline flex items-center space-x-0.5"
                >
                  <span>Webshare.io (10 Free Proxies) ↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
