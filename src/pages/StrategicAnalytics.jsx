import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Radar, RefreshCw, Sparkles, TrendingUp, Globe, Search, Zap } from 'lucide-react';
import BusinessSwitcher from '@/components/strategic/BusinessSwitcher';
import PlatformGrid from '@/components/strategic/PlatformGrid';
import GapList from '@/components/strategic/GapList';
import ForecastPanel from '@/components/strategic/ForecastPanel';
import BusinessComparison from '@/components/strategic/BusinessComparison';
import { PLATFORMS } from '@/lib/platforms';

export default function StrategicAnalytics() {
  const queryClient = useQueryClient();
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState('gaps');

  const { data: businesses = [], isLoading: bizLoading } = useQuery({
    queryKey: ['strategic-businesses'],
    queryFn: async () => {
      const res = await base44.entities.Business.filter({ status: 'active' }, { sort: 'name', limit: 100 });
      return res.items || res;
    },
  });

  useEffect(() => {
    if (!selectedBusinessId && businesses.length > 0) setSelectedBusinessId(businesses[0].id);
  }, [businesses, selectedBusinessId]);

  const { data: gaps = [], refetch: refetchGaps } = useQuery({
    queryKey: ['strategic-gaps', selectedBusinessId],
    queryFn: async () => {
      if (!selectedBusinessId) return [];
      const res = await base44.entities.Gap.filter({ business_id: selectedBusinessId, status: { $in: ['open', 'in_progress'] } }, { sort: '-created_date', limit: 50 });
      return res.items || res;
    },
    enabled: !!selectedBusinessId,
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ['strategic-snapshots', selectedBusinessId],
    queryFn: async () => {
      if (!selectedBusinessId) return [];
      const res = await base44.entities.AnalyticsSnapshot.filter({ business_id: selectedBusinessId }, { sort: 'fetched_at', limit: 50 });
      return res.items || res;
    },
    enabled: !!selectedBusinessId,
  });

  const runScan = async () => {
    setScanning(true);
    setError(null);
    setScanResult(null);
    try {
      const res = await base44.functions.invoke('strategic_scan', { business_id: selectedBusinessId || null });
      setScanResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['strategic-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['strategic-gaps'] });
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      await refetchGaps();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleStatusChange = async (gapId, status) => {
    await base44.entities.Gap.update(gapId, { status });
    queryClient.invalidateQueries({ queryKey: ['strategic-gaps'] });
  };

  const gaSnapshot = snapshots.find(s => s.source === 'google_analytics');
  const scSnapshot = snapshots.find(s => s.source === 'google_search_console');

  return (
    <div className="p-4 sm:p-8 bg-gradient-to-b from-violet-50/30 to-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-200">
            <Radar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Strategic Analytics</h1>
            <p className="text-sm text-gray-500">Skip-trace every account · Find gaps · Close them with AI</p>
          </div>
        </div>
        <Button onClick={runScan} disabled={scanning} className="bg-violet-600 hover:bg-violet-700">
          {scanning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {scanning ? 'Scanning all accounts…' : 'Run Skip-Trace Scan'}
        </Button>
      </div>

      {/* Business Switcher */}
      <Card className="mb-6 border-violet-100">
        <CardContent className="p-4">
          {bizLoading ? (
            <div className="h-12 animate-pulse bg-gray-100 rounded" />
          ) : businesses.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-3">No businesses detected yet. Run a scan to auto-detect from your connected Google accounts.</p>
              <Button onClick={runScan} disabled={scanning} variant="outline" size="sm">
                <Search className="w-4 h-4 mr-2" /> Detect businesses
              </Button>
            </div>
          ) : (
            <BusinessSwitcher
              businesses={businesses}
              selectedId={selectedBusinessId}
              onSelect={setSelectedBusinessId}
              onAddNew={() => {}}
            />
          )}
        </CardContent>
      </Card>

      {/* Platform Grid */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4" /> Connected Platforms
        </h3>
        <PlatformGrid platforms={PLATFORMS} onConnect={(p) => setError(`${p.name} is available to connect. Ask the assistant to "connect ${p.name}" to authorize it.`)} />
      </div>

      {/* Live Metrics */}
      {(gaSnapshot || scSnapshot) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {gaSnapshot?.metrics?.totals && (
            <>
              <MetricCard label="Sessions (28d)" value={gaSnapshot.metrics.totals.sessions || 0} icon={TrendingUp} color="#e8710a" />
              <MetricCard label="Conversions (28d)" value={gaSnapshot.metrics.totals.conversions || 0} icon={Zap} color="#34a853" />
            </>
          )}
          {scSnapshot?.metrics && (
            <>
              <MetricCard label="Search Clicks (28d)" value={scSnapshot.metrics.totalClicks || 0} icon={Search} color="#4285f4" />
              <MetricCard label="Avg Position" value={(scSnapshot.metrics.avgPosition || 0).toFixed(1)} icon={TrendingUp} color="#7c3aed" />
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Scan Result Banner */}
      {scanResult && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <Sparkles className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Skip-trace complete. Scanned <strong>{scanResult.scanned}</strong> business(es) and found <strong>{scanResult.gaps?.length || 0}</strong> gaps. AI recommendations are ready below.
          </AlertDescription>
        </Alert>
      )}

      {/* Growth Forecast */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-violet-600" /> Growth Forecast
        </h3>
        <ForecastPanel snapshots={snapshots} />
      </div>

      {/* View Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('gaps')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'gaps' ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300'}`}
          >
            <Radar className="w-4 h-4 inline mr-1" /> Gap Analysis
            {gaps.length > 0 && <Badge className="ml-1.5 bg-violet-100 text-violet-700">{gaps.length}</Badge>}
          </button>
          <button
            onClick={() => setView('compare')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'compare' ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300'}`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1" /> Compare Businesses
          </button>
        </div>
      </div>

      {view === 'compare' ? (
        <BusinessComparison businesses={businesses} />
      ) : scanning ? (
        <Card><CardContent className="p-12 text-center">
          <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Searching all accounts, fetching metrics, and finding gaps…</p>
        </CardContent></Card>
      ) : (
        <GapList gaps={gaps} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}