import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Radar, Plus, RefreshCw, Globe, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import DomainDetail from '@/components/domains/DomainDetail';
import BulkActionBar from '@/components/domains/BulkActionBar';
import BulkMetadataDialog from '@/components/domains/BulkMetadataDialog';

export default function DomainOperations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newDomain, setNewDomain] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [running, setRunning] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkCrawling, setBulkCrawling] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const res = await base44.entities.Domain.filter({}, { sort: '-created_date', limit: 100 });
      return res.items || res;
    },
  });

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    setRunning(true);
    try {
      await base44.functions.invoke('domain_agent_run', { domain_url: newDomain.trim() });
      setNewDomain('');
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    } finally {
      setRunning(false);
    }
  };

  const runPipeline = async (domainId) => {
    setRunning(true);
    try {
      await base44.functions.invoke('domain_agent_run', { domain_id: domainId });
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast({ title: 'Crawl complete', description: 'Domain data refreshed.' });
    } catch (e) {
      toast({ title: 'Crawl failed', description: e.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkCrawl = async () => {
    setBulkCrawling(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map(id => base44.functions.invoke('domain_agent_run', { domain_id: id })));
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast({ title: 'Bulk crawl complete', description: `${ids.length} domain(s) refreshed.` });
      setSelectedIds(new Set());
    } catch (e) {
      toast({ title: 'Bulk crawl failed', description: e.message, variant: 'destructive' });
    } finally {
      setBulkCrawling(false);
    }
  };

  const handleBulkMetadata = async (updates) => {
    const ids = Array.from(selectedIds);
    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(cleanUpdates).length === 0) return;
    await base44.entities.Domain.bulkUpdate(ids.map(id => ({ id, ...cleanUpdates })));
    queryClient.invalidateQueries({ queryKey: ['domains'] });
    toast({ title: 'Metadata updated', description: `${ids.length} domain(s) updated.` });
    setMetadataOpen(false);
    setSelectedIds(new Set());
  };

  const statusConfig = {
    active: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    onboarding: { icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
    pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
    error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
    paused: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg">
          <Radar className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domain Operations</h1>
          <p className="text-sm text-gray-500">Add a URL — the agent handles everything end-to-end</p>
        </div>
      </div>

      {/* Add Domain */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              placeholder="Enter URL (e.g. example.com)"
              onKeyDown={e => e.key === 'Enter' && addDomain()}
              className="flex-1"
            />
            <Button onClick={addDomain} disabled={running || !newDomain.trim()} className="shrink-0">
              <Plus className="w-4 h-4 mr-1" /> {running ? 'Running Pipeline...' : 'Add & Scan'}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            The agent will crawl the site, read Search Console + GA4, scan competitors, and generate an action queue — fully autonomous.
          </p>
        </CardContent>
      </Card>

      {/* Domain Grid */}
      {isLoading ? (
        <div className="h-32 animate-pulse bg-gray-100 rounded" />
      ) : domains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No domains yet. Add your first URL above to begin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map(d => {
            const sc = statusConfig[d.status] || statusConfig.pending;
            const isSelected = selectedIds.has(d.id);
            return (
              <Card key={d.id} className={`cursor-pointer hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-indigo-400' : ''}`} onClick={() => setSelectedDomain(d)}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div onClick={e => { e.stopPropagation(); toggleSelect(d.id); }}>
                        <Checkbox checked={isSelected} />
                      </div>
                      <Globe className="w-5 h-5 text-indigo-600 shrink-0" />
                      <p className="font-semibold text-sm truncate">{d.domain}</p>
                    </div>
                    <Badge className={`${sc.bg} ${sc.color} shrink-0`}>
                      <sc.icon className="w-3 h-3 mr-1" /> {d.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>Sitemap: {d.sitemap_status || 'Not checked'}</p>
                    <p>Pages: {d.page_count || 0}</p>
                    <p>GSC: {d.gsc_property ? 'Connected' : 'Not found'}</p>
                    <p>GA4: {d.ga4_property_id ? 'Connected' : 'Not found'}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: `conic-gradient(#6366f1 ${(d.health_score || 0) * 3.6}deg, #e5e7eb 0deg)` }}>
                        <span className="text-gray-700">{d.health_score || 0}</span>
                      </div>
                      <span className="text-xs text-gray-400">Health</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); runPipeline(d.id); }}>
                      <RefreshCw className="w-3 h-3 mr-1" /> Scan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Domain Detail Modal */}
      {selectedDomain && (
        <DomainDetail domain={selectedDomain} onClose={() => setSelectedDomain(null)} />
      )}

      {/* Bulk Actions */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onCrawl={handleBulkCrawl}
        onOpenMetadata={() => setMetadataOpen(true)}
        crawling={bulkCrawling}
      />
      <BulkMetadataDialog
        open={metadataOpen}
        onClose={() => setMetadataOpen(false)}
        selectedDomains={Array.from(selectedIds).map(id => domains.find(d => d.id === id)).filter(Boolean)}
        onSave={handleBulkMetadata}
      />
    </div>
  );
}