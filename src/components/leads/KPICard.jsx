import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ title, value, subValue, trend, Icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm text-gray-600">{title}</span>
          {Icon && (
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xl sm:text-2xl font-bold text-gray-900">{value}</span>
          {subValue && (
            <span className="text-xs sm:text-sm text-gray-500 mt-1">{subValue}</span>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}