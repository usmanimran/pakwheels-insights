import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Car, Globe, RefreshCw, Upload, Check, ExternalLink, ShieldAlert } from 'lucide-react';
import { fetchProxySettings, saveProxySettings, testProxySettings } from '../services/api';

export default function ScrapeProgressModal({ progress, onClose, onRetry }) {
  if (!progress) return null;

  const isDone = progress.status === 'done';
  const isError = progress.status === 'error';

  // Proxy Configuration State
  const [proxyInput, setProxyInput] = useState('');
  const [proxyStatus, setProxyStatus] = useState(null);
  const [savingProxy, setSavingProxy] = useState(false);
  const [uploadingDb, setUploadingDb] = useState(false);

  useEffect(() => {
    if (isError) {
      fetchProxySettings()
        .then((res) => {
          if (res?.proxy) setProxyInput(res.proxy);
        })
        .catch(() => {});
    }
  }, [isError]);

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

  const handleDirectDbUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDb(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/db/import', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        alert('Database restored successfully from local file! Refreshing...');
        window.location.reload();
      } else {
        const err = await res.json();
        alert('Upload failed: ' + (err.detail || 'Unknown error'));
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingDb(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#0D2342] border border-slate-200 dark:border-[#1C3B66] rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8232C]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button when done or error */}
        {(isDone || isError) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg bg-slate-100 dark:bg-[#112646] border border-slate-200 dark:border-[#1C3B66] transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            isDone
              ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : isError
              ? 'bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              : 'bg-[#C8232C]/15 dark:bg-[#C8232C]/20 text-[#C8232C] border border-[#C8232C]/30'
          }`}>
            {isDone ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            ) : isError ? (
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            ) : (
              <Car className="w-6 h-6 text-[#C8232C] animate-bounce" />
            )}
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
              {isDone ? 'Scrape Completed!' : isError ? 'Scraping Blocked (Cloud WAF)' : 'Scraping Live PakWheels'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {progress.message || 'Extracting listings & pricing metadata...'}
            </p>
          </div>
        </div>

        {/* Progress Bar (Visible when scraping or done) */}
        {!isError && (
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {progress.total_pages ? `Page ${progress.current_page || 1} of ${progress.total_pages}` : 'Connecting...'}
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white">{progress.percent || 0}%</span>
            </div>

            <div className="h-2.5 w-full bg-slate-100 dark:bg-[#08162B] rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-[#1C3B66]">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  isDone
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-[#C8232C] to-amber-500'
                }`}
                style={{ width: `${progress.percent || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Pills */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-[#112646] p-2.5 rounded-2xl border border-slate-200 dark:border-[#1C3B66] text-center mb-4">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Listings Scraped</span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{progress.count || 0}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Status</span>
            <span className={`text-xs font-black uppercase ${
              isDone ? 'text-emerald-600 dark:text-emerald-400' : isError ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400 animate-pulse'
            }`}>
              {isDone ? 'Ready' : isError ? 'Cloud 403 WAF' : 'In Progress'}
            </span>
          </div>
        </div>

        {/* When Done: Explore Button */}
        {isDone && (
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition"
          >
            Explore Scraped Data ({progress.count} cars)
          </button>
        )}

        {/* When Cloudflare 403 Block Occurs: Actionable Solutions */}
        {isError && (
          <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-[#1A3B6B]">
            
            {/* Solution Card 1: Cloud Scraper Proxy Setup */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#08162B] border border-slate-200 dark:border-[#1C3B66] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <Globe className="w-3.5 h-3.5 text-sky-500" />
                  <span>Option 1: Add a Scraper Proxy (for Railway)</span>
                </div>
                <a
                  href="https://www.webshare.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-0.5"
                >
                  <span>Free 10 Proxies ↗</span>
                </a>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                PakWheels blocks datacenter IPs like Railway with Cloudflare WAF. Enter a residential/datacenter proxy below to bypass the block.
              </p>

              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={proxyInput}
                  onChange={(e) => setProxyInput(e.target.value)}
                  placeholder="http://user:pass@host:port or http://host:port"
                  className="flex-1 px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-[#112646] border border-slate-300 dark:border-[#1C3B66] text-slate-900 dark:text-white font-mono placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleTestProxy}
                  disabled={proxyStatus?.type === 'testing'}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-[#1C3B66] dark:hover:bg-[#254B80] text-slate-800 dark:text-slate-100 transition flex items-center space-x-1 flex-shrink-0"
                >
                  {proxyStatus?.type === 'testing' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span>Test</span>}
                </button>
                <button
                  type="button"
                  onClick={handleSaveProxy}
                  disabled={savingProxy}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition flex-shrink-0 shadow-sm"
                >
                  {savingProxy ? 'Saving...' : 'Save'}
                </button>
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
            </div>

            {/* Solution Card 2: 1-Click Upload Local PC Database */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#08162B] border border-slate-200 dark:border-[#1C3B66] space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Upload className="w-3.5 h-3.5 text-emerald-500" />
                <span>Option 2: Sync from Local Computer (Instant)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Your local PC's home Wi-Fi IP is <strong>never blocked</strong> by Cloudflare. Run the scraper on your PC, then upload the <code className="text-[10px] bg-slate-200 dark:bg-[#112646] px-1 py-0.5 rounded">pakwheels.db</code> file here to sync live listings in 1 second.
              </p>
              <div>
                <label className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingDb ? 'Uploading Database...' : 'Upload Local pakwheels.db File'}</span>
                  <input
                    type="file"
                    accept=".db,.sqlite,.sqlite3"
                    onChange={handleDirectDbUpload}
                    disabled={uploadingDb}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Retry Button */}
            {onRetry && (
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRetry();
                  }}
                  className="flex-1 py-2 px-4 rounded-xl font-bold text-xs bg-[#C8232C] hover:bg-[#A81B23] text-white shadow-md transition flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Scraping Now</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-[#112646] dark:hover:bg-[#1C3B66] text-slate-700 dark:text-slate-300 transition"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
