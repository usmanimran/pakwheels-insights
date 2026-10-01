import React from 'react';
import { Tag, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, Gauge, Scale, Award } from 'lucide-react';

export default function KpiCards({ analytics, loading }) {
  const cards = [
    {
      title: 'Total Active Listings',
      value: loading ? '...' : analytics?.total_listings?.toLocaleString() || '0',
      subtitle: 'Currently scraped listings',
      icon: Tag,
      iconColor: 'text-indigo-400',
      bgGlow: 'from-indigo-500/10 to-transparent',
      borderColor: 'border-indigo-500/20'
    },
    {
      title: 'Average Market Price',
      value: loading ? '...' : analytics?.formatted_avg_price || 'PKR 0',
      subtitle: analytics?.avg_price ? `PKR ${analytics.avg_price.toLocaleString()}` : 'Based on current filter',
      icon: TrendingUp,
      iconColor: 'text-sky-400',
      bgGlow: 'from-sky-500/10 to-transparent',
      borderColor: 'border-sky-500/20'
    },
    {
      title: 'Lowest Listed Price',
      value: loading ? '...' : analytics?.formatted_min_price || 'PKR 0',
      subtitle: 'Minimum available entry price',
      icon: ArrowDownRight,
      iconColor: 'text-emerald-400',
      bgGlow: 'from-emerald-500/10 to-transparent',
      borderColor: 'border-emerald-500/20'
    },
    {
      title: 'Highest Listed Price',
      value: loading ? '...' : analytics?.formatted_max_price || 'PKR 0',
      subtitle: 'Top-tier / brand new condition',
      icon: ArrowUpRight,
      iconColor: 'text-rose-400',
      bgGlow: 'from-rose-500/10 to-transparent',
      borderColor: 'border-rose-500/20'
    },
    {
      title: 'Median Price & Mileage',
      value: loading ? '...' : analytics?.formatted_median_price || 'PKR 0',
      subtitle: analytics?.avg_mileage ? `Avg Mileage: ${analytics.avg_mileage.toLocaleString()} km` : 'Typical car metrics',
      icon: Scale,
      iconColor: 'text-amber-400',
      bgGlow: 'from-amber-500/10 to-transparent',
      borderColor: 'border-amber-500/20'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`bg-slate-900/90 border ${c.borderColor} rounded-2xl p-4 relative overflow-hidden shadow-lg transition hover:scale-[1.02]`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${c.bgGlow} rounded-full blur-xl pointer-events-none`} />
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">{c.title}</span>
              <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
                <Icon className={`w-4 h-4 ${c.iconColor}`} />
              </div>
            </div>

            <div className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1 truncate">
              {c.value}
            </div>

            <div className="text-[11px] text-slate-400 truncate">
              {c.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
}
