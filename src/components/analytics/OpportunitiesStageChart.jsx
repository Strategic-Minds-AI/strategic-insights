import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function OpportunitiesStageChart({ opportunities = [] }) {
  const data = React.useMemo(() => {
    const stages = {};
    const colors = {
      prospecting: '#3b82f6',
      qualification: '#06b6d4',
      proposal: '#eab308',
      negotiation: '#f97316',
    };
    
    opportunities.forEach(opp => {
      const stage = opp.stage || 'prospecting';
      if (['prospecting', 'qualification', 'proposal', 'negotiation'].includes(stage)) {
        stages[stage] = (stages[stage] || 0) + 1;
      }
    });
    
    const total = Object.values(stages).reduce((sum, val) => sum + val, 0) || 1;
    
    return Object.entries(stages).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round((value / total) * 100),
      color: colors[name] || '#6b7280',
    }));
  }, [opportunities]);

  const topStage = data.length > 0 ? data[0] : { value: 0 };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Opportunities by Stage</CardTitle>
        <button className="text-gray-400 hover:text-gray-600">⋮</button>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
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
            <p className="text-sm text-gray-500">Top Stage</p>
            <p className="text-3xl font-bold">{topStage.value}%</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-sm text-gray-600">{item.name} {item.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}