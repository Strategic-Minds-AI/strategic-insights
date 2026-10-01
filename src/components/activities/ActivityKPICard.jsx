import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function ActivityKPICard({ title, value, trend, trendValue, subText, Icon, color = 'blue', chartData }) {
  const colorClasses = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
    cyan: 'text-cyan-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs text-gray-600">{title}</span>
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-bold">{value}</div>
            {subText && <div className="text-xs text-gray-500 mt-1">{subText}</div>}
          </div>
          {chartData && (
            <div className="h-10 w-20 flex items-end gap-0.5">
              {chartData.map((height, i) => (
                <div 
                  key={i} 
                  className={`flex-1 ${color === 'blue' ? 'bg-blue-400' : color === 'green' ? 'bg-green-400' : color === 'red' ? 'bg-red-400' : color === 'cyan' ? 'bg-cyan-400' : 'bg-gray-400'} rounded-sm`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}