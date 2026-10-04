import React from 'react';
import { ExternalLink, Calendar, MapPin, Gauge } from 'lucide-react';

export default function ListingsTable({ listings }) {
  return (
    <div className="bg-white dark:bg-[#0D2342] border border-slate-200 dark:border-[#1C3B66] rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs min-w-[640px]">
          <thead className="bg-slate-50 dark:bg-[#112646] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-[#1C3B66]">
            <tr>
              <th className="py-3 px-4">Vehicle</th>
              <th className="py-3 px-4">Year</th>
              <th className="py-3 px-4">Price (Lacs)</th>
              <th className="py-3 px-4">Mileage</th>
              <th className="py-3 px-4">Transmission</th>
              <th className="py-3 px-4">City</th>
              <th className="py-3 px-4">Updated</th>
              <th className="py-3 px-4 text-right">Ad Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#1C3B66] text-slate-700 dark:text-slate-300">
            {listings.map((l) => {
              const priceLacs = l.price_pkr ? (l.price_pkr / 100000).toFixed(2) : '-';
              return (
                <tr key={l.pakwheels_id || l.id} className="hover:bg-slate-50/80 dark:hover:bg-[#16345C]/50 transition">
                  <td className="py-3 px-4 flex items-center space-x-3">
                    {l.image_url ? (
                      <img
                        src={l.image_url}
                        alt=""
                        className="w-10 h-10 object-cover rounded-lg flex-shrink-0 bg-slate-100 dark:bg-[#08162B]"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#08162B] flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500">
                        Car
                      </div>
                    )}
                    <div className="truncate max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white truncate" title={l.title}>
                        {l.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {l.variant && l.variant !== 'Standard' ? l.variant : `${l.make} ${l.model}`}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{l.year}</td>
                  <td className="py-3 px-4">
                    <span className="font-black text-emerald-600 dark:text-emerald-400">{priceLacs} L</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      PKR {l.price_pkr?.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">{l.mileage_km ? `${l.mileage_km.toLocaleString()} km` : 'N/A'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      l.transmission?.toLowerCase() === 'automatic'
                        ? 'bg-sky-500/15 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30'
                        : 'bg-slate-100 dark:bg-[#112646] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1A3B6B]'
                    }`}>
                      {l.transmission || 'Manual'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{l.city || 'Pakistan'}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{l.updated_ago || 'Recently'}</td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={l.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 font-bold text-xs text-slate-600 dark:text-slate-300 hover:text-[#C8232C] dark:hover:text-[#C8232C] transition"
                      title="Open listing on PakWheels"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
