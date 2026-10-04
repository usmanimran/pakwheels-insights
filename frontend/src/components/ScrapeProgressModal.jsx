import React from 'react';
import { Zap, CheckCircle2, AlertCircle, X, Car } from 'lucide-react';

export default function ScrapeProgressModal({ progress, onClose }) {
  if (!progress) return null;

  const isDone = progress.status === 'done';
  const isError = progress.status === 'error';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-pw-navy-850 border border-pw-navy-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pw-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button when done or error */}
        {(isDone || isError) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-pw-navy-800 border border-pw-navy-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isDone
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : isError
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-pw-red-500/20 text-pw-red-400 border border-pw-red-500/30'
          }`}>
            {isDone ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : isError ? (
              <AlertCircle className="w-6 h-6 text-rose-400" />
            ) : (
              <Car className="w-6 h-6 text-pw-red-400 animate-bounce" />
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">
              {isDone ? 'Scrape Completed!' : isError ? 'Scraping Failed' : 'Scraping Live PakWheels'}
            </h3>
            <p className="text-xs text-slate-400">
              {progress.message || 'Extracting listings & pricing metadata...'}
            </p>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">
              {progress.total_pages ? `Page ${progress.current_page || 1} of ${progress.total_pages}` : 'Connecting...'}
            </span>
            <span className="font-extrabold text-white">{progress.percent || 0}%</span>
          </div>

          <div className="h-3 w-full bg-pw-navy-900 rounded-full overflow-hidden p-0.5 border border-pw-navy-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isDone
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-pw-red-600 to-amber-500'
              }`}
              style={{ width: `${progress.percent || 0}%` }}
            />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3 bg-pw-navy-800/80 p-3 rounded-2xl border border-pw-navy-700 text-center mb-5">
          <div>
            <span className="text-[11px] text-slate-400 block">Listings Scraped</span>
            <span className="text-lg font-black text-white">{progress.count || 0}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Status</span>
            <span className={`text-xs font-bold uppercase ${
              isDone ? 'text-emerald-400' : isError ? 'text-rose-400' : 'text-amber-400 animate-pulse'
            }`}>
              {isDone ? 'Ready' : isError ? 'Error' : 'In Progress'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {isDone && (
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition"
          >
            Explore Scraped Data ({progress.count} cars)
          </button>
        )}

      </div>
    </div>
  );
}
