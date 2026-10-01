import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function MetricCard({ label, value, sublabel, trend, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-cyan-600',
    orange: 'from-orange-500 to-amber-600',
    purple: 'from-purple-500 to-pink-600',
    red: 'from-red-500 to-rose-600',
  };
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-400';

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-2">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white shadow-sm`}>
            {Icon && <Icon className="w-5 h-5" />}
          </div>
          {trend !== undefined && trend !== null && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}