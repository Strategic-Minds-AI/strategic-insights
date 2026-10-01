import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function PerformanceTrendChart({ domains }) {
  const [selectedDomainId, setSelectedDomainId] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) setSelectedDomainId(domains[0].id);
  }, [domains, selectedDomainId]);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!selectedDomainId) return;
      setLoading(true);
      try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const res = await base44.entities.DomainMetric.filter(
          { domain_id: selectedDomainId, date: { $gte: ninetyDaysAgo.toISOString().slice(0, 10) } },
          { sort: 'date', limit: 100 }
        );
        const items = res.items || res;
        // Aggregate by date — combine metrics from multiple sources
        const byDate = {};
        items.forEach(m => {
          const d = m.date;
          if (!byDate[d]) byDate[d] = { date: d, clicks: 0, impressions: 0, users: 0, conversions: 0 };
          const mt = m.metrics || {};
          byDate[d].clicks += mt.totalClicks || mt.total_clicks || mt.clicks || 0;
          byDate[d].impressions += mt.totalImpressions || mt.total_impressions || mt.impressions || 0;
          byDate[d].users += mt.users || mt.total_users || 0;
          byDate[d].conversions += mt.conversions || 0;
        });
        const sorted = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
        setChartData(sorted.map(d => ({
          ...d,
          label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })));
      } catch {
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, [selectedDomainId]);

  const selectedDomain = domains.find(d => d.id === selectedDomainId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" /> 90-Day Performance
          </CardTitle>
          {domains.length > 0 && (
            <Select value={selectedDomainId || ''} onValueChange={setSelectedDomainId}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map(d => <SelectItem key={d.id} value={d.id}>{d.domain}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-gray-400">
            No metric data for the last 90 days. Run a domain scan to start collecting.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} name="Clicks" />
                <Line type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Impressions" />
                <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} dot={false} name="Users" />
                <Line type="monotone" dataKey="conversions" stroke="#f59e0b" strokeWidth={2} dot={false} name="Conversions" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-center text-xs">
              <span className="text-gray-400">Total: <strong className="text-gray-700">{chartData.reduce((s, d) => s + d.clicks, 0).toLocaleString()}</strong> clicks</span>
              <span className="text-gray-400">Over <strong className="text-gray-700">{chartData.length}</strong> data points</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}