import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RAGIndicator({ status, label, count, subtitle, description }) {
  const statusConfig = {
    green: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      icon: TrendingUp,
      iconColor: 'text-emerald-600'
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      icon: Minus,
      iconColor: 'text-amber-600'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
      icon: TrendingDown,
      iconColor: 'text-red-600'
    }
  };

  const config = statusConfig[status] || statusConfig.amber;
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-lg",
      config.bg,
      config.border
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded-full animate-pulse", config.dot)} />
          <span className={cn("text-sm font-semibold", config.text)}>
            {label}
          </span>
        </div>
        <Icon className={cn("w-5 h-5", config.iconColor)} />
      </div>
      
      <div className="space-y-1">
        {count !== undefined && (
          <p className={cn("text-3xl font-bold", config.text)}>
            {count}
          </p>
        )}
        {subtitle && (
          <p className="text-sm text-slate-600 normal-case">
            {subtitle}
          </p>
        )}
        {description && (
          <p className="text-xs text-slate-500 mt-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}