import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function CalendarKPICard({ title, value, trend, trendValue, icon: Icon, color = 'blue' }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', chart: 'bg-blue-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', chart: 'bg-green-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', chart: 'bg-purple-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', chart: 'bg-orange-200' },
  };

  const colorClass = colorClasses[color];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg ${colorClass.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colorClass.text}`} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-600 mt-1">{title}</div>
      </CardContent>
    </Card>
  );
}