import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Eye, MousePointerClick, Hash, Users, MonitorPlay, FileText, Target } from 'lucide-react';

const metricDefs = [
  { key: 'clicks', label: 'Clicks', icon: MousePointerClick, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'impressions', label: 'Impressions', icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'ctr', label: 'CTR', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', suffix: '%' },
  { key: 'position', label: 'Avg Position', icon: Hash, color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'total_users', label: 'Users', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'sessions', label: 'Sessions', icon: MonitorPlay, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { key: 'page_views', label: 'Page Views', icon: FileText, color: 'text-pink-600', bg: 'bg-pink-50' },
  { key: 'conversions', label: 'Conversions', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

function MetricCard({ def, value }) {
  const Icon = def.icon;
  const display = value != null ? (def.suffix ? `${value}${def.suffix}` : value) : '—';
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">{def.label}</span>
          <div className={`w-8 h-8 rounded-lg ${def.bg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${def.color}`} />
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{display}</p>
      </CardContent>
    </Card>
  );
}

export default function DomainMetricGrid({ gscMetrics, gaMetrics }) {
  const gsc = gscMetrics || {};
  const ga = gaMetrics || {};

  const values = {
    clicks: gsc.total_clicks,
    impressions: gsc.total_impressions,
    ctr: gsc.avg_ctr ? parseFloat(String(gsc.avg_ctr).replace('%', '')) : null,
    position: gsc.avg_position ? parseFloat(String(gsc.avg_position)) : null,
    total_users: ga.total_users,
    sessions: ga.sessions,
    page_views: ga.page_views,
    conversions: ga.conversions,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {metricDefs.map(def => (
        <MetricCard key={def.key} def={def} value={values[def.key]} />
      ))}
    </div>
  );
}