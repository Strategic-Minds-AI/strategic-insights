import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { LayoutDashboard, Globe, RefreshCw, Send } from 'lucide-react';
import DomainSwitcher from '@/components/dashboard/DomainSwitcher';
import DomainDetailPanel from '@/components/dashboard/DomainDetailPanel';

export default function DomainDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState(null);
  const [rescanning, setRescanning] = useState(false);
  const [pushingSitemap, setPushingSitemap] = useState(false);

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const res = await base44.entities.Domain.filter({}, { sort: '-created_date', limit: 100 });
      return res.items || res;
    },
  });

  // Auto-select first domain
  const activeId = selectedId || (domains[0]?.id ?? null);
  const activeDomain = useMemo(() => domains.find(d => d.id === activeId), [domains, activeId]);

  const { data: metrics = [] } = useQuery({
    queryKey: ['domain-metrics', activeId],
    queryFn: async () => {
      if (!activeId) return [];
      const res = await base44.entities.DomainMetric.filter(
        { domain_id: activeId },
        { sort: '-date', limit: 30 }
      );
      return res.items || res;
    },
    enabled: !!activeId,
  });

  const handleRescan = async () => {
    if (!activeDomain) return;
    setRescanning(true);
    try {
      await base44.functions.invoke('domain_agent_run', { domain_id: activeDomain.id });
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['domain-metrics', activeId] });
      toast({ title: 'Analytics refreshed', description: `${activeDomain.domain} data updated.` });
    } catch (e) {
      toast({ title: 'Refresh failed', description: e.message, variant: 'destructive' });
    } finally {
      setRescanning(false);
    }
  };

  const handlePushSitemap = async () => {
    if (!activeDomain) return;
    setPushingSitemap(true);
    try {
      const res = await base44.functions.invoke('request_domain_approval', {
        domain_id: activeDomain.id,
        action_type: 'SUBMIT_SITEMAP'
      });
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast({
        title: 'Approval requested',
        description: `${activeDomain.domain} sitemap submission is queued for operator approval. Approval ID: ${res.data?.approval?.id || 'pending'}`
      });
    } catch (e) {
      toast({ title: 'Approval request failed', description: e.message, variant: 'destructive' });
    } finally {
      setPushingSitemap(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domain Dashboard</h1>
          <p className="text-sm text-gray-500">Key performance metrics for each connected site</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse bg-gray-100 rounded" />
      ) : domains.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No domains yet. Add one from Domain Ops to start tracking.</p>
        </div>
      ) : (
        <>
          <DomainSwitcher domains={domains} selectedId={activeId} onSelect={d => setSelectedId(d.id)} />

          {/* One-click actions */}
          {activeDomain && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handlePushSitemap}
                disabled={pushingSitemap}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                  {pushingSitemap ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {pushingSitemap ? 'Requesting...' : 'Request Sitemap Submission'}
                </button>
              <button
                onClick={handleRescan}
                disabled={rescanning}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 transition-colors"
              >
                {rescanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {rescanning ? 'Refreshing...' : 'Refresh Analytics'}
              </button>
            </div>
          )}

          <div className="mt-4">
            <DomainDetailPanel
              domain={activeDomain}
              metrics={metrics}
              onRescan={handleRescan}
              rescanning={rescanning}
            />
          </div>
        </>
      )}
    </div>
  );
}