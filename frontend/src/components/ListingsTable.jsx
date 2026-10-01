import React from 'react';
import { ExternalLink, Calendar, MapPin, Gauge } from 'lucide-react';

export default function ListingsTable({ listings }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700/60">
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
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {listings.map((l) => {
              const priceLacs = l.price_pkr ? (l.price_pkr / 100000).toFixed(2) : '-';
              return (
                <tr key={l.pakwheels_id || l.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 flex items-center space-x-3">
                    {l.image_url ? (
                      <img
                        src={l.image_url}
                        alt=""
                        className="w-10 h-10 object-cover rounded-lg flex-shrink-0 bg-slate-800"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-slate-600">
                        Car
                      </div>
                    )}
                    <div className="truncate max-w-xs">
                      <div className="font-semibold text-white truncate" title={l.title}>
                        {l.title}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {l.variant && l.variant !== 'Standard' ? l.variant : `${l.make} ${l.model}`}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">{l.year}</td>
                  <td className="py-3 px-4">
                    <span className="font-black text-emerald-400">{priceLacs} L</span>
                    <span className="text-[10px] text-slate-500 block">
                      PKR {l.price_pkr?.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">{l.mileage_km ? `${l.mileage_km.toLocaleString()} km` : 'N/A'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      l.transmission?.toLowerCase() === 'automatic'
                        ? 'bg-sky-500/20 text-sky-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {l.transmission || 'Manual'}
                    </span>
                  </td>
                  <td className="py-3 px-4">{l.city || 'Pakistan'}</td>
                  <td className="py-3 px-4 text-slate-400">{l.updated_ago || 'Recently'}</td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={l.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-slate-400 hover:text-red-400 transition"
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
