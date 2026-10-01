import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, CheckCircle2, XCircle, Play } from 'lucide-react';

export default function GA4Provisioning() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('provision_ga4_properties', { dry_run: dryRun });
      if (res.error) setError(res.error);
      else setResult(res);
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
            <Globe className="w-4 h-4 text-blue-500" /> GA4 Auto-Provisioning
          </CardTitle>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded"
              />
              Dry run
            </label>
            <Button size="sm" onClick={run} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
              {loading ? 'Provisioning...' : 'Provision All'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-72 overflow-auto">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!result && !loading && !error && (
          <p className="text-sm text-gray-400 text-center py-4">
            Creates a GA4 property for every tracked site that doesn't have one, then links the property ID back. Toggle off dry run to actually create.
          </p>
        )}
        {result && (
          <>
            <div className="flex items-center gap-3 text-xs text-gray-500 pb-2 border-b">
              <span>{result.total_sites} sites to provision</span>
              <span>•</span>
              <Badge variant={result.created > 0 ? 'default' : 'secondary'} className="text-xs">
                {result.created} created
              </Badge>
              {result.failed > 0 && <Badge variant="destructive" className="text-xs">{result.failed} failed</Badge>}
              {result.dry_run && <Badge variant="outline" className="text-xs">DRY RUN</Badge>}
            </div>
            {result.results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-2 border rounded-lg">
                {r.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.site}</p>
                  <p className="text-xs text-gray-500">
                    {r.status === 'success' ? `Property ${r.property_id} created & linked` : r.error || r.action}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{r.type}</Badge>
              </div>
            ))}
            {result.results.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">All tracked sites already have a GA4 property.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}