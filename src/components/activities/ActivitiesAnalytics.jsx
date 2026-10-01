import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';

export default function ActivitiesAnalytics({ activities }) {
  const activitiesByType = React.useMemo(() => {
    const types = ['Call', 'Email', 'Meeting', 'Task', 'Note'];
    return types.map(type => ({
      type,
      count: activities.filter(a => a.type === type).length,
    }));
  }, [activities]);

  const colors = {
    'Call': '#3b82f6',
    'Email': '#8b5cf6',
    'Meeting': '#f59e0b',
    'Task': '#10b981',
    'Note': '#14b8a6',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Activities by Type</CardTitle>
          <button className="text-gray-400 hover:text-gray-600">•••</button>
        </div>
        <p className="text-xs text-gray-500">Last 2 days</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={activitiesByType}>
            <XAxis dataKey="type" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-4">
          {activitiesByType.map((item) => (
            <div key={item.type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[item.type] }}></div>
              <span className="text-xs text-gray-600">{item.type} {item.count}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Checkbox id="activities" defaultChecked />
            <label htmlFor="activities" className="text-sm font-medium cursor-pointer">Activities</label>
            <button className="ml-auto text-gray-400 hover:text-gray-600">•••</button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}