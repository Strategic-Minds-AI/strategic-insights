import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUp, ArrowDown, Minus, Trophy, RefreshCw } from 'lucide-react';

const METRICS = [
  { key: 'sessions', label: 'Sessions', format: 'num' },
  { key: 'totalUsers', label: 'Users', format: 'num' },
  { key: 'newUsers', label: 'New Users', format: 'num' },
  { key: 'engagementRate', label: 'Engagement', format: 'pct' },
  { key: 'avgSessionDuration', label: 'Avg Duration', format: 'dur' },
  { key: 'conversions', label: 'Conversions', format: 'num' },
  { key: 'revenue', label: 'Revenue', format: 'cur' },
];

function formatValue(val, format) {
  if (val === null || val === undefined) return '—';
  switch (format) {
    case 'num': return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    case 'pct': return `${(val * 100).toFixed(1)}%`;
    case 'dur': return `${Math.round(val)}s`;
    case 'cur': return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    default: return val;
  }
}

function DeltaBadge({ delta }) {
  if (delta === null || delta === undefined || isNaN(delta)) return <Minus className="w-3 h-3 text-gray-400" />;
  const isUp = delta > 0;
  const isFlat = delta === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isFlat ? 'text-gray-400' : isUp ? 'text-green-600' : 'text-red-500'}`}>
      {isFlat ? <Minus className="w-3 h-3" /> : isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(delta).toFixed(0)}%
    </span>
  );
}

export default function CrossSiteComparison() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [sortBy, setSortBy] = useState('sessions');
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('cross_site_comparison', { days });
      if (res.error) setError(res.error);
      else setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sorted = useMemo(() => {
    if (!data?.results) return [];
    return [...data.results].sort((a, b) => (b.current?.[sortBy] || 0) - (a.current?.[sortBy] || 0));
  }, [data, sortBy]);

  const visible = showAll ? sorted : sorted.slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Cross-Site Comparison
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="text-xs border rounded px-2 py-1 bg-white"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        {!data && !loading && !error && (
          <p className="text-sm text-gray-400 text-center py-8">
            Click refresh to fetch metrics from all tracked GA4 properties and compare them side by side.
          </p>
        )}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}
        {data && !loading && (
          <div className="space-y-3">
            {/* Aggregate totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-3 border-b">
              <div>
                <p className="text-xs text-gray-500">Total Sessions</p>
                <p className="text-lg font-bold">{data.totals.sessions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Users</p>
                <p className="text-lg font-bold">{data.totals.totalUsers.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Conversions</p>
                <p className="text-lg font-bold">{data.totals.conversions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Revenue</p>
                <p className="text-lg font-bold">${data.totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400">Sort by:</span>
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSortBy(m.key)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${sortBy === m.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Comparison table — mobile cards */}
            <div className="space-y-2">
              {visible.map((site, i) => (
                <div key={site.propertyId} className={`p-3 border rounded-lg ${i === 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {i === 0 && <Trophy className="w-4 h-4 text-amber-500 shrink-0" />}
                      <span className="font-medium text-sm truncate">{site.name}</span>
                    </div>
                    {site.status === 'error' && <Badge variant="destructive" className="text-xs shrink-0">Error</Badge>}
                  </div>
                  {site.status === 'error' ? (
                    <p className="text-xs text-red-400">{site.error}</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1.5">
                      {METRICS.map((m) => (
                        <div key={m.key} className="flex flex-col">
                          <span className="text-xs text-gray-400">{m.label}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">{formatValue(site.current?.[m.key], m.format)}</span>
                            <DeltaBadge delta={site.deltas?.[m.key]} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {sorted.length > 8 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2"
              >
                {showAll ? 'Show top 8' : `Show all ${sorted.length}`}
              </button>
            )}
            {sorted.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No tracked GA4 properties found. Provision properties first.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}