import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import GapCard from './GapCard';

export default function GapList({ gaps, onStatusChange }) {
  const bySeverity = useMemo(() => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...gaps].sort((a, b) => (order[a.severity] || 2) - (order[b.severity] || 2));
  }, [gaps]);

  const chartData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    gaps.forEach(g => { counts[g.severity] = (counts[g.severity] || 0) + 1; });
    return Object.entries(counts).map(([sev, count]) => ({ sev: sev.charAt(0).toUpperCase() + sev.slice(1), count }));
  }, [gaps]);

  const colors = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#3b82f6' };

  if (gaps.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-400 text-lg">No gaps detected yet</p>
          <p className="text-gray-500 text-sm mt-1">Run a skip-trace scan to analyze all connected accounts and find gaps.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm">Gaps by Severity</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <XAxis dataKey="sev" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={colors[entry.sev]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Skip-Trace Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['critical', 'high', 'medium', 'low'].map(sev => {
                const count = gaps.filter(g => g.severity === sev).length;
                const c = SEV_COLORS[sev];
                return (
                  <div key={sev} className="text-center p-3 rounded-lg" style={{ backgroundColor: `${c}15` }}>
                    <p className="text-2xl font-bold" style={{ color: c }}>{count}</p>
                    <p className="text-xs text-gray-600 capitalize">{sev}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bySeverity.map(g => <GapCard key={g.id} gap={g} onStatusChange={onStatusChange} />)}
      </div>
    </div>
  );
}

const SEV_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6' };