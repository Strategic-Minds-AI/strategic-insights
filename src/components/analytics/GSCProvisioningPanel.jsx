import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, CheckCircle2, XCircle, Play } from 'lucide-react';

export default function GSCProvisioningPanel() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = dryRun
        ? await base44.functions.invoke('provision_gsc_properties', { dry_run: true })
        : await base44.functions.invoke('request_domain_approval', {
            action_type: 'CREATE_GSC_PROPERTIES_BULK',
            scope_type: 'bulk'
          });
      const payload = res.data || res;
      if (payload.error) setError(payload.error);
      else if (dryRun) setResult(payload);
      else setResult({
        approval_required: true,
        approval_id: payload.approval?.id,
        results: [],
        total_sites: 0,
        added: 0,
        failed: 0,
        dry_run: false
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-500" /> GSC Auto-Provisioning
          </CardTitle>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="rounded" />
              Dry run
            </label>
            <Button size="sm" onClick={run} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
              {loading ? 'Working...' : (dryRun ? 'Preview Provisioning' : 'Request Provisioning Approval')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-auto">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!result && !loading && !error && (
          <p className="text-sm text-gray-400 text-center py-4">
            Dry run previews untracked Search Console properties. Turning dry run off creates an operator approval request; it does not add properties directly.
          </p>
        )}
        {result?.approval_required && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            GSC provisioning is pending operator approval. Approval ID: <code>{result.approval_id || 'pending'}</code>
          </div>
        )}
        {result && !result.approval_required && (
          <>
            <div className="flex items-center gap-3 text-xs text-gray-500 pb-2 border-b">
              <span>{result.total_sites} sites to add</span>
              <Badge variant={result.added > 0 ? 'default' : 'secondary'} className="text-xs">{result.added} added</Badge>
              {result.failed > 0 && <Badge variant="destructive" className="text-xs">{result.failed} failed</Badge>}
              {result.dry_run && <Badge variant="outline" className="text-xs">DRY RUN</Badge>}
            </div>
            {(result.results || []).map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-2 border rounded-lg">
                {r.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.site}</p>
                  <p className="text-xs text-gray-500">{r.status === 'success' ? `Added as ${r.gsc_url}` : r.error || r.action}</p>
                </div>
              </div>
            ))}
            {(!result.results || result.results.length === 0) && <p className="text-sm text-gray-400 text-center py-2">All sites already have GSC properties.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}