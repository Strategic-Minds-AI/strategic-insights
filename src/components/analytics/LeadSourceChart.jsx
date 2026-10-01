import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function LeadSourceChart({ leads = [], opportunities = [] }) {
  const data = React.useMemo(() => {
    const sources = {};
    const colors = {
      call: '#3b82f6',
      email: '#f97316',
      website: '#06b6d4',
      partner: '#eab308',
    };
    
    [...leads, ...opportunities].forEach(item => {
      const source = item.source || 'email';
      sources[source] = (sources[source] || 0) + 1;
    });
    
    const total = Object.values(sources).reduce((sum, val) => sum + val, 0) || 1;
    
    return Object.entries(sources).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((value / total) * 100),
      color: colors[name] || '#6b7280',
    }));
  }, [leads, opportunities]);

  const topSource = data.length > 0 ? data[0] : { value: 0 };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Lead Source</CardTitle>
        <button className="text-gray-400 hover:text-gray-600">⋮</button>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-sm text-gray-500">Top Source</p>
            <p className="text-3xl font-bold">{topSource.value}%</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-sm text-gray-600">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}