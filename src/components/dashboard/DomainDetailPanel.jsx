import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, FileText, Search, BarChart3, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import DomainMetricGrid from './DomainMetricGrid';
import DomainTrendChart from './DomainTrendChart';

const statusConfig = {
  active: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  onboarding: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
  pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  paused: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
};

export default function DomainDetailPanel({ domain, metrics, onRescan, rescanning }) {
  if (!domain) return null;
  const sc = statusConfig[domain.status] || statusConfig.pending;
  const StatusIcon = sc.icon;

  const gscMetrics = (metrics || []).find(m => m.source === 'google_search_console');
  const gaMetrics = (metrics || []).find(m => m.source === 'google_analytics');

  const keywords = (() => {
    try { return JSON.parse(domain.target_keywords || '[]'); } catch { return []; }
  })();

  return (
    <div className="space-y-4">
      {/* Domain header */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Globe className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{domain.domain}</h2>
                <a href={domain.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline">
                  {domain.url}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${sc.bg} ${sc.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" /> {domain.status}
              </Badge>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: `conic-gradient(#6366f1 ${(domain.health_score || 0) * 3.6}deg, #e5e7eb 0deg)` }}>
                  <span className="text-gray-700">{domain.health_score || 0}</span>
                </div>
                <span className="text-xs text-gray-500">Health</span>
              </div>
              <button
                onClick={onRescan}
                disabled={rescanning}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                title="Rescan"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${rescanning ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-400">Sitemap</p>
                <p className="font-medium text-gray-700 truncate max-w-[140px]">{domain.sitemap_status || 'Not checked'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-400">Search Console</p>
                <p className="font-medium text-gray-700">{domain.gsc_property ? 'Connected' : 'Not found'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-400">GA4</p>
                <p className="font-medium text-gray-700">{domain.ga4_property_id ? 'Connected' : 'Not found'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-400">Pages</p>
                <p className="font-medium text-gray-700">{domain.page_count || 0}</p>
              </div>
            </div>
          </div>

          {domain.last_error && (
            <div className="mt-3 p-2 rounded-lg bg-red-50 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {domain.last_error}
            </div>
          )}

          {keywords.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1.5">Target Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {keywords.slice(0, 8).map((k, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metric cards */}
      <DomainMetricGrid gscMetrics={gscMetrics?.metrics} gaMetrics={gaMetrics?.metrics} />

      {/* Trend chart */}
      <DomainTrendChart metrics={metrics} />
    </div>
  );
}

[executed on device: JARVIS-COMMAND (68702b78-725a-4b76-878f-f1693f485414)]