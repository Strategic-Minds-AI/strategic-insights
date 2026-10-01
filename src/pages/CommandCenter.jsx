import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radar, RefreshCw, DollarSign, Users, MousePointerClick, Target, Globe, TrendingUp, Award, Activity } from 'lucide-react';
import Star3D from '@/components/icons/Star3D';
import MetricCard from '@/components/command/MetricCard';
import ActionQueue from '@/components/command/ActionQueue';
import SelfDiscovery from '@/components/command/SelfDiscovery';
import InsightsPanel from '@/components/command/InsightsPanel';
import PerformanceTrendChart from '@/components/command/PerformanceTrendChart';
import CrossSourceInsights from '@/components/command/CrossSourceInsights';
import AnomalyAlerts from '@/components/command/AnomalyAlerts';
import NLQueryBar from '@/components/command/NLQueryBar';
import RevenuePriorityQueue from '@/components/command/RevenuePriorityQueue';
import AutonomousExecution from '@/components/command/AutonomousExecution';

export default function CommandCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('command_center', {});
      if (res.error) setError(res.error);
      else setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const { data: domainRecords = [] } = useQuery({
    queryKey: ['command-domains'],
    queryFn: async () => {
      const res = await base44.entities.Domain.filter({ status: { $in: ['active', 'onboarding'] } }, { sort: 'domain', limit: 50 });
      return res.items || res;
    },
  });

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <Card className="max-w-md"><CardContent className="pt-6 text-center">
          <p className="text-red-500 mb-3">Error loading Command Center</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <Button onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  const tl = data?.top_line || {};

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Star3D size={40} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Command Center</h1>
            <p className="text-xs text-gray-400">Self-building intelligence across all your data</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Top-line metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <MetricCard label="Pipeline Value" value={`$${(tl.pipeline_value || 0).toLocaleString()}`} sublabel={`${tl.win_rate || 0}% win rate`} icon={DollarSign} color="green" />
        <MetricCard label="Net Profit" value={`$${(tl.net_profit || 0).toLocaleString()}`} sublabel={`Rev $${(tl.revenue || 0).toLocaleString()}`} icon={TrendingUp} color={tl.net_profit >= 0 ? 'green' : 'red'} />
        <MetricCard label="Total Clicks" value={(tl.total_clicks || 0).toLocaleString()} sublabel={`${(tl.total_impressions || 0).toLocaleString()} impressions`} icon={MousePointerClick} color="blue" />
        <MetricCard label="Total Users" value={(tl.total_users || 0).toLocaleString()} sublabel={`${tl.total_conversions || 0} conversions`} icon={Users} color="purple" />
        <MetricCard label="Domains" value={tl.domains || 0} sublabel={`${tl.competitors_tracked || 0} competitors`} icon={Globe} color="indigo" />
      </div>

      {/* Natural Language Query */}
      <NLQueryBar />

      {/* AI Insights + Action Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2">
          <InsightsPanel insights={data?.insights} />
        </div>
        <ActionQueue actions={data?.actions || []} alerts={data?.alerts || []} />
      </div>

      {/* Cross-Source Intelligence + Revenue Priority Queue + Anomaly Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <CrossSourceInsights />
        <RevenuePriorityQueue />
        <AnomalyAlerts />
      </div>

      {/* Autonomous Execution */}
      <div className="mb-5">
        <AutonomousExecution />
      </div>

      {/* 90-Day Performance Trend */}
      {domainRecords.length > 0 && (
        <div className="mb-5">
          <PerformanceTrendChart domains={domainRecords} />
        </div>
      )}

      {/* Self-Discovery + Domain Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2">
          <SelfDiscovery discovery={data?.self_discovery} />
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" /> Domain Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-auto">
            {(data?.domains || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No domains yet.</p>
            ) : (data?.domains || []).map((d, i) => (
              <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: `conic-gradient(#6366f1 ${(d.health || 0) * 3.6}deg, #e5e7eb 0deg)` }}>
                  <span className="text-gray-700">{d.health || 0}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{d.domain}</p>
                  <p className="text-xs text-gray-400">{d.clicks} clicks · {d.users} users · {d.pages} pages</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{d.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* CRM + Financial summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" /> CRM Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><p className="text-lg font-bold">{data?.crm?.accounts || 0}</p><p className="text-xs text-gray-400">Accounts</p></div>
              <div><p className="text-lg font-bold">{data?.crm?.contacts || 0}</p><p className="text-xs text-gray-400">Contacts</p></div>
              <div><p className="text-lg font-bold">{data?.crm?.leads || 0}</p><p className="text-xs text-gray-400">Leads</p></div>
              <div><p className="text-lg font-bold">{data?.crm?.opportunities || 0}</p><p className="text-xs text-gray-400">Opps</p></div>
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between text-sm">
              <span className="text-gray-500">Pipeline Value</span>
              <span className="font-bold text-green-600">${(data?.crm?.pipeline_value || 0).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" /> Competitive Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div><p className="text-lg font-bold">{data?.competitive?.competitors_tracked || 0}</p><p className="text-xs text-gray-400">Competitors</p></div>
              <div><p className="text-lg font-bold">{data?.top_line?.domains || 0}</p><p className="text-xs text-gray-400">Domains</p></div>
              <div><p className="text-lg font-bold">{data?.top_line?.goals_active || 0}</p><p className="text-xs text-gray-400">Goals</p></div>
            </div>
            {(data?.competitive?.scans || []).slice(0, 3).map((c, i) => (
              <div key={i} className="text-xs text-gray-500 truncate py-0.5">• {c.competitor_name || c.competitor_url}</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}