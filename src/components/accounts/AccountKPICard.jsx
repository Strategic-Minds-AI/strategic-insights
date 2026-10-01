import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function AccountKPICard({ title, value, trend, trendValue, Icon, color = 'blue', chartData }) {
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
          <div className="text-2xl sm:text-3xl font-bold">{value}</div>
          {chartData && (
            <div className="h-10 w-24 flex items-end gap-0.5">
              {chartData.map((height, i) => (
                <div 
                  key={i} 
                  className={`flex-1 rounded-sm ${
                    color === 'blue' ? 'bg-blue-400' : 
                    color === 'green' ? 'bg-green-400' : 
                    color === 'cyan' ? 'bg-cyan-400' : 
                    color === 'red' ? 'bg-red-400' : 'bg-purple-400'
                  }`}
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