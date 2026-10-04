import React from 'react';
import { ExternalLink, MapPin, Gauge, Fuel, Calendar, Cog, Zap } from 'lucide-react';

export default function ListingCard({ listing }) {
  const priceLacs = listing.price_pkr ? (listing.price_pkr / 100000).toFixed(2) : '0';
  const isCrore = listing.price_pkr >= 10000000;
  const formattedPrice = isCrore
    ? `${(listing.price_pkr / 10000000).toFixed(2)} Crore`
    : `${priceLacs} Lacs`;

  return (
    <div className="bg-[#0D2342] border border-[#1C3B66] hover:border-[#2563EB]/60 rounded-2xl overflow-hidden shadow-lg transition duration-200 hover:-translate-y-1 flex flex-col group">
      
      {/* Image Container */}
      <div className="relative h-44 w-full bg-[#08162B] overflow-hidden">
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 bg-[#08162B]">
            <span className="text-xs font-medium">No Photo Available</span>
          </div>
        )}

        {/* Featured / Managed Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {listing.is_managed_pw === 1 && (
            <span className="bg-[#C8232C] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow">
              Managed by PakWheels
            </span>
          )}
          {listing.is_featured === 1 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow flex items-center space-x-0.5">
              <Zap className="w-2.5 h-2.5 fill-current" />
              <span>Featured</span>
            </span>
          )}
        </div>

        {/* Price Overlay */}
        <div className="absolute bottom-2.5 right-2.5 bg-[#061021]/90 backdrop-blur-md border border-[#1A3B6B] px-2.5 py-1 rounded-xl shadow-lg">
          <span className="text-xs sm:text-sm font-black text-emerald-400">
            PKR {formattedPrice}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-[#C8232C]" />
              <span className="font-medium text-slate-300">{listing.city || 'Pakistan'}</span>
            </span>
            <span>•</span>
            <span>{listing.updated_ago || 'Recently'}</span>
          </div>

          <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-2 group-hover:text-red-400 transition" title={listing.title}>
            {listing.title}
          </h4>
        </div>

        {/* Quick Specs Pills */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 py-2 border-y border-[#1C3B66]">
          <div className="flex items-center space-x-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span>{listing.year} Model</span>
          </div>
          <div className="flex items-center space-x-1.5 truncate">
            <Gauge className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>{listing.mileage_km ? `${listing.mileage_km.toLocaleString()} km` : 'N/A'}</span>
          </div>
          <div className="flex items-center space-x-1.5 truncate">
            <Cog className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span>{listing.transmission || 'Manual'}</span>
          </div>
          <div className="flex items-center space-x-1.5 truncate">
            <Fuel className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>{listing.engine_cc ? `${listing.engine_cc} cc` : 'Petrol'}</span>
          </div>
        </div>

        {/* Footer & PakWheels Link */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[140px]">
            {listing.variant && listing.variant !== 'Standard' ? listing.variant : `${listing.make} ${listing.model}`}
          </span>

          <a
            href={listing.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-xs font-bold text-slate-200 hover:text-white bg-[#112646] hover:bg-[#C8232C] px-3 py-1.5 rounded-lg border border-[#1A3B6B] hover:border-[#C8232C] transition shadow-sm"
          >
            <span>View Ad</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>

    </div>
  );
}
