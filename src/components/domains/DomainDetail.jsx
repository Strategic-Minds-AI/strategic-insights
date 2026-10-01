import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Search, BarChart3, Users, Target, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function DomainDetail({ domain, onClose }) {
  const [tab, setTab] = useState('overview');
  const [metrics, setMetrics] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [m, c, a] = await Promise.all([
          base44.entities.DomainMetric.filter({ domain_id: domain.id }, { sort: '-created_date', limit: 20 }),
          base44.entities.CompetitorScan.filter({ domain_id: domain.id }, { sort: '-created_date', limit: 10 }),
          base44.entities.DomainAction.filter({ domain_id: domain.id }, { sort: '-created_date', limit: 50 }),
        ]);
        setMetrics(m.items || m);
        setCompetitors(c.items || c);
        setActions(a.items || a);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [domain.id]);

  const updateAction = async (id, status) => {
    await base44.entities.DomainAction.update(id, { status });
    setActions(actions.map(a => a.id === id ? { ...a, status } : a));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'search', label: 'Search Console', icon: Search },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'competitors', label: 'Competitors', icon: Users },
    { id: 'actions', label: 'Actions', icon: Target },
  ];

  const gscMetric = metrics.find(m => m.source === 'google_search_console');
  const ga4Metric = metrics.find(m => m.source === 'google_analytics');
  const openActions = actions.filter(a => a.status === 'open');
  const priorityColors = { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-gray-100 text-gray-600' };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" /> {domain.domain}
          </h2>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <div className="flex gap-1 p-2 border-b overflow-x-auto shrink-0">
          {tabs.map(t => (
            <Button key={t.id} size="sm" variant={tab === t.id ? 'default' : 'ghost'} onClick={() => setTab(t.id)} className="shrink-0">
              <t.icon className="w-4 h-4 mr-1" /> {t.label}
            </Button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="h-40 animate-pulse bg-gray-100 rounded" />
          ) : tab === 'overview' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card><CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{domain.health_score || 0}</p>
                  <p className="text-xs text-gray-400">Health Score</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{gscMetric?.metrics?.total_clicks || 0}</p>
                  <p className="text-xs text-gray-400">Clicks (28d)</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{ga4Metric?.metrics?.total_users || 0}</p>
                  <p className="text-xs text-gray-400">Users (28d)</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">{openActions.length}</p>
                  <p className="text-xs text-gray-400">Open Actions</p>
                </CardContent></Card>
              </div>
              {domain.sitemap_status && (
                <div className="text-sm"><span className="text-gray-400">Sitemap:</span> {domain.sitemap_status}</div>
              )}
              {domain.competitors && (
                <div className="text-sm"><span className="text-gray-400">Competitors:</span> {JSON.parse(domain.competitors || '[]').join(', ')}</div>
              )}
              {domain.target_keywords && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Target Keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {JSON.parse(domain.target_keywords || '[]').map((k, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : tab === 'search' ? (
            <div className="space-y-2">
              {gscMetric ? (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-gray-50 rounded"><p className="font-bold">{gscMetric.metrics.total_impressions}</p><p className="text-xs text-gray-400">Impressions</p></div>
                    <div className="text-center p-2 bg-gray-50 rounded"><p className="font-bold">{gscMetric.metrics.avg_ctr}</p><p className="text-xs text-gray-400">CTR</p></div>
                    <div className="text-center p-2 bg-gray-50 rounded"><p className="font-bold">{gscMetric.metrics.avg_position}</p><p className="text-xs text-gray-400">Avg Position</p></div>
                  </div>
                  <p className="font-medium text-sm mb-2">Top Queries</p>
                  {(gscMetric.metrics.top_queries || []).map((q, i) => (
                    <div key={i} className="flex items-center justify-between border rounded p-2 text-sm">
                      <span className="font-medium">{q.query}</span>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>{q.clicks} clicks</span>
                        <span>{q.impressions} impr</span>
                        <span>#{q.position}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : <p className="text-gray-400 text-sm py-8 text-center">No Search Console data. Property not found for this domain.</p>}
            </div>
          ) : tab === 'analytics' ? (
            <div className="space-y-2">
              {ga4Metric ? (
                <div className="grid grid-cols-2 gap-3">
                  <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{ga4Metric.metrics.total_users}</p><p className="text-xs text-gray-400">Total Users</p></CardContent></Card>
                  <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{ga4Metric.metrics.sessions}</p><p className="text-xs text-gray-400">Sessions</p></CardContent></Card>
                  <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{ga4Metric.metrics.page_views}</p><p className="text-xs text-gray-400">Page Views</p></CardContent></Card>
                  <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{ga4Metric.metrics.conversions}</p><p className="text-xs text-gray-400">Conversions</p></CardContent></Card>
                </div>
              ) : <p className="text-gray-400 text-sm py-8 text-center">No GA4 data. No Analytics property found.</p>}
            </div>
          ) : tab === 'competitors' ? (
            <div className="space-y-3">
              {competitors.length === 0 ? <p className="text-gray-400 text-sm py-8 text-center">No competitor scans yet.</p> :
                competitors.map(c => (
                  <Card key={c.id}><CardContent className="pt-4">
                    <p className="font-semibold text-sm mb-1">{c.competitor_name || c.competitor_url}</p>
                    <p className="text-xs text-gray-500 mb-2">{c.competitor_url}</p>
                    {c.strengths && <p className="text-sm mb-1"><span className="text-gray-400">Strengths:</span> {c.strengths}</p>}
                    {c.content_gaps && <p className="text-sm mb-1"><span className="text-gray-400">Content gaps:</span> {c.content_gaps}</p>}
                    {c.keyword_gaps && <p className="text-sm"><span className="text-gray-400">Keyword gaps:</span> {c.keyword_gaps}</p>}
                  </CardContent></Card>
                ))}
            </div>
          ) : tab === 'actions' ? (
            <div className="space-y-2">
              {actions.length === 0 ? <p className="text-gray-400 text-sm py-8 text-center">No actions yet. Run a scan to generate recommendations.</p> :
                actions.map(a => (
                  <div key={a.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm">{a.title}</p>
                      <Badge className={`${priorityColors[a.priority] || priorityColors.medium} shrink-0`}>{a.priority}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{a.description}</p>
                    {a.estimated_impact && <p className="text-xs text-green-600 mb-2">Impact: {a.estimated_impact}</p>}
                    <div className="flex gap-1">
                      {a.status === 'open' ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateAction(a.id, 'in_progress')}>Start</Button>
                          <Button size="sm" variant="ghost" onClick={() => updateAction(a.id, 'dismissed')}>Dismiss</Button>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs">{a.status}</Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}