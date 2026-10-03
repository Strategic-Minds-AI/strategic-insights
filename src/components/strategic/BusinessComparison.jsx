import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function useBusinessSnapshots(businessId) {
  return useQuery({
    queryKey: ['compare-snapshots', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const res = await base44.entities.AnalyticsSnapshot.filter({ business_id: businessId }, { sort: '-fetched_at', limit: 20 });
      return res.items || res;
    },
    enabled: !!businessId,
  });
}

function extractMetrics(snapshots) {
  const ga = snapshots.find(s => s.source === 'google_analytics');
  const sc = snapshots.find(s => s.source === 'google_search_console');
  return {
    sessions: ga?.metrics?.totals?.sessions || ga?.metrics?.sessions || 0,
    conversions: ga?.metrics?.totals?.conversions || ga?.metrics?.conversions || 0,
    users: ga?.metrics?.totals?.total_users || ga?.metrics?.total_users || 0,
    clicks: sc?.metrics?.totalClicks || sc?.metrics?.total_clicks || 0,
    impressions: sc?.metrics?.totalImpressions || sc?.metrics?.total_impressions || 0,
    avgPosition: sc?.metrics?.avgPosition || sc?.metrics?.avg_position || 0,
    ctr: sc?.metrics?.ctr || 0,
  };
}

export default function BusinessComparison({ businesses }) {
  const [bizA, setBizA] = useState(null);
  const [bizB, setBizB] = useState(null);

  React.useEffect(() => {
    if (!bizA && businesses[0]) setBizA(businesses[0].id);
    if (!bizB && businesses[1]) setBizB(businesses[1].id);
  }, [businesses, bizA, bizB]);

  const { data: snapsA = [] } = useBusinessSnapshots(bizA);
  const { data: snapsB = [] } = useBusinessSnapshots(bizB);

  const metricsA = useMemo(() => extractMetrics(snapsA), [snapsA]);
  const metricsB = useMemo(() => extractMetrics(snapsB), [snapsB]);

  const bizAName = businesses.find(b => b.id === bizA)?.name || 'Business A';
  const bizBName = businesses.find(b => b.id === bizB)?.name || 'Business B';

  const comparisonRows = [
    { key: 'sessions', label: 'Sessions', a: metricsA.sessions, b: metricsB.sessions, higherIsBetter: true },
    { key: 'users', label: 'Users', a: metricsA.users, b: metricsB.users, higherIsBetter: true },
    { key: 'clicks', label: 'Search Clicks', a: metricsA.clicks, b: metricsB.clicks, higherIsBetter: true },
    { key: 'impressions', label: 'Impressions', a: metricsA.impressions, b: metricsB.impressions, higherIsBetter: true },
    { key: 'conversions', label: 'Conversions', a: metricsA.conversions, b: metricsB.conversions, higherIsBetter: true },
    { key: 'avgPosition', label: 'Avg Position', a: metricsA.avgPosition, b: metricsB.avgPosition, higherIsBetter: false, decimals: 1 },
  ];

  const chartData = comparisonRows.map(r => ({
    metric: r.label,
    [bizAName]: r.a,
    [bizBName]: r.b,
  }));

  const winsA = comparisonRows.filter(r => r.higherIsBetter ? r.a > r.b : r.a < r.b).length;
  const winsB = comparisonRows.filter(r => r.higherIsBetter ? r.b > r.a : r.b < r.a).length;
  const winner = winsA > winsB ? bizAName : winsB > winsA ? bizBName : 'Tied';

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-violet-200">
          <CardContent className="pt-4">
            <label className="text-xs text-gray-400 mb-1 block">Business A</label>
            <Select value={bizA || ''} onValueChange={setBizA}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select business" /></SelectTrigger>
              <SelectContent>
                {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card className="border-indigo-200">
          <CardContent className="pt-4">
            <label className="text-xs text-gray-400 mb-1 block">Business B</label>
            <Select value={bizB || ''} onValueChange={setBizB}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select business" /></SelectTrigger>
              <SelectContent>
                {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Winner banner */}
      {bizA && bizB && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-semibold text-gray-700">
            {winner === 'Tied' ? 'Neck and neck — it\'s a tie' : `${winner} is winning`}
          </span>
          <Badge variant="secondary" className="text-xs">{winsA} - {winsB}</Badge>
        </div>
      )}

      {/* Comparison chart */}
      {bizA && bizB && (snapsA.length > 0 || snapsB.length > 0) ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Metric Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="metric" tick={{ fontSize: 11 }} width={90} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey={bizAName} fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                <Bar dataKey={bizBName} fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      {/* Side-by-side metric rows */}
      {bizA && bizB ? (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-400 mb-2 px-2">
              <span>{bizAName}</span>
              <span className="text-center">Metric</span>
              <span className="text-right">{bizBName}</span>
            </div>
            <div className="space-y-1.5">
              {comparisonRows.map(r => {
                const aWins = r.higherIsBetter ? r.a > r.b : r.a < r.b;
                const bWins = r.higherIsBetter ? r.b > r.a : r.b < r.a;
                const fmt = (v) => r.decimals ? v.toFixed(r.decimals) : v.toLocaleString();
                return (
                  <div key={r.key} className="grid grid-cols-3 items-center gap-2 px-2 py-2 rounded-lg bg-gray-50">
                    <span className={`text-sm font-bold ${aWins ? 'text-violet-600' : 'text-gray-500'}`}>
                      {fmt(r.a)}
                    </span>
                    <span className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                      {r.label}
                      {aWins && <Trophy className="w-3 h-3 text-violet-400" />}
                      {bWins && <Trophy className="w-3 h-3 text-indigo-400" />}
                    </span>
                    <span className={`text-sm font-bold text-right ${bWins ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {fmt(r.b)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="py-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Select two businesses to compare performance side by side.</p>
        </CardContent></Card>
      )}
    </div>
  );
}

[executed on device: JARVIS-COMMAND (68702b78-725a-4b76-878f-f1693f485414)]