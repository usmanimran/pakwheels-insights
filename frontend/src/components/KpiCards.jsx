import React from 'react';
import { Tag, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, Gauge, Scale, Award } from 'lucide-react';

export default function KpiCards({ analytics, loading }) {
  const cards = [
    {
      title: 'Average Market Price',
      value: loading ? '...' : analytics?.formatted_avg_price || 'PKR 0',
      subtitle: analytics?.avg_price ? `PKR ${analytics.avg_price.toLocaleString()}` : 'Based on current filter',
      icon: TrendingUp,
      iconColor: 'text-[#C8232C]',
      bgGlow: 'from-[#C8232C]/15 to-transparent',
      borderColor: 'border-[#C8232C]/40',
      isHero: true
    },
    {
      title: 'Total Active Listings',
      value: loading ? '...' : analytics?.total_listings?.toLocaleString() || '0',
      subtitle: 'Currently scraped cars',
      icon: Tag,
      iconColor: 'text-sky-400',
      bgGlow: 'from-sky-500/15 to-transparent',
      borderColor: 'border-[#1C3B66]'
    },
    {
      title: 'Lowest Listed Price',
      value: loading ? '...' : analytics?.formatted_min_price || 'PKR 0',
      subtitle: 'Minimum entry price',
      icon: ArrowDownRight,
      iconColor: 'text-emerald-400',
      bgGlow: 'from-emerald-500/15 to-transparent',
      borderColor: 'border-[#1C3B66]'
    },
    {
      title: 'Highest Listed Price',
      value: loading ? '...' : analytics?.formatted_max_price || 'PKR 0',
      subtitle: 'Top tier condition',
      icon: ArrowUpRight,
      iconColor: 'text-rose-400',
      bgGlow: 'from-rose-500/15 to-transparent',
      borderColor: 'border-[#1C3B66]'
    },
    {
      title: 'Median Price & Mileage',
      value: loading ? '...' : analytics?.formatted_median_price || 'PKR 0',
      subtitle: analytics?.avg_mileage ? `Avg: ${analytics.avg_mileage.toLocaleString()} km` : 'Typical metrics',
      icon: Scale,
      iconColor: 'text-amber-400',
      bgGlow: 'from-amber-500/15 to-transparent',
      borderColor: 'border-[#1C3B66]'
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`bg-[#0D2342] border ${c.borderColor} rounded-2xl p-3 sm:p-4 relative overflow-hidden shadow-lg transition hover:border-[#2563EB]/50 ${
              c.isHero ? 'col-span-2 lg:col-span-1 bg-gradient-to-br from-[#0D2342] via-[#102A4C] to-[#0A192F]' : 'col-span-1'
            }`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${c.bgGlow} rounded-full blur-xl pointer-events-none`} />
            
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-300 truncate pr-1">{c.title}</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-[#112646] border border-[#1A3B6B]/60 flex-shrink-0">
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${c.iconColor}`} />
              </div>
            </div>

            <div className="text-base sm:text-xl lg:text-2xl font-black text-white tracking-tight mb-0.5 truncate">
              {c.value}
            </div>

            <div className="text-[10px] sm:text-[11px] text-slate-400 truncate font-medium">
              {c.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
}
