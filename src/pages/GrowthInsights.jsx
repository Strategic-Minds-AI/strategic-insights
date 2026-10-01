import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import CrossDomainSummary from '@/components/insights/CrossDomainSummary';
import CompetitorGapAlerts from '@/components/insights/CompetitorGapAlerts';
import GrowthRecommendations from '@/components/insights/GrowthRecommendations';

export default function GrowthInsights() {
  const { data: domains = [], isLoading: ld } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const res = await base44.entities.Domain.filter({}, { sort: '-created_date', limit: 100 });
      return res.items || res;
    },
  });

  const { data: metrics = [], isLoading: lm } = useQuery({
    queryKey: ['all-domain-metrics'],
    queryFn: async () => {
      const res = await base44.entities.DomainMetric.filter({}, { sort: '-date', limit: 500 });
      return res.items || res;
    },
  });

  const { data: scans = [], isLoading: ls } = useQuery({
    queryKey: ['all-competitor-scans'],
    queryFn: async () => {
      const res = await base44.entities.CompetitorScan.filter({}, { sort: '-scanned_at', limit: 200 });
      return res.items || res;
    },
  });

  const { data: actions = [], isLoading: la } = useQuery({
    queryKey: ['all-domain-actions'],
    queryFn: async () => {
      const res = await base44.entities.DomainAction.filter({}, { sort: '-created_date', limit: 200 });
      return res.items || res;
    },
  });

  const loading = ld || lm || ls || la;

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Growth Insights</h1>
          <p className="text-sm text-gray-500">Cross-domain performance, competitor gaps, and actionable recommendations</p>
        </div>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse bg-gray-100 rounded" />
      ) : domains.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-gray-400">No domains yet. Add domains from Domain Ops to see aggregated insights.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <CrossDomainSummary domains={domains} metrics={metrics} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CompetitorGapAlerts scans={scans} />
            <GrowthRecommendations actions={actions} />
          </div>
        </div>
      )}
    </div>
  );
}