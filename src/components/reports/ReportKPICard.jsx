import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function ReportKPICard({ title, value, subtitle, icon: Icon, color = 'blue', trend, trendValue, sparklineData = [] }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', sparkline: '#3b82f6' },
    green: { bg: 'bg-green-50', text: 'text-green-600', sparkline: '#10b981' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', sparkline: '#8b5cf6' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', sparkline: '#f97316' },
    red: { bg: 'bg-red-50', text: 'text-red-600', sparkline: '#ef4444' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', sparkline: '#06b6d4' },
  };

  const colorClass = colorClasses[color];

  return (
    <Card className="border border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${colorClass.bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${colorClass.text}`} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">{title}</div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-end justify-between mt-2">
          {sparklineData.length > 0 && (
            <div className="flex-1 h-12 mr-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={colorClass.sparkline} 
                    strokeWidth={2} 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          
          <div className="flex flex-col items-end">
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{trendValue}</span>
              </div>
            )}
            {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}