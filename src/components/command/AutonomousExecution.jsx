import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, CheckCircle2, XCircle, Play } from 'lucide-react';

export default function AutonomousExecution() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('auto_resolve_actions', { dry_run: dryRun });
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
            <Zap className="w-4 h-4 text-amber-500" /> Autonomous Execution
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
              {loading ? 'Running...' : 'Execute'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-auto">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!result && !loading && !error && (
          <p className="text-sm text-gray-400 text-center py-4">
            Auto-resolves open actions that don't need human intervention (sitemap pushes, rescans). Toggle off dry run to apply changes.
          </p>
        )}
        {result && (
          <>
            <div className="flex items-center gap-3 text-xs text-gray-500 pb-2 border-b">
              <span>{result.total_open} open items</span>
              <span>•</span>
              <span>{result.attempted} attempted</span>
              <span>•</span>
              <Badge variant={result.resolved > 0 ? 'default' : 'secondary'} className="text-xs">
                {result.resolved} resolved
              </Badge>
              {result.dry_run && <Badge variant="outline" className="text-xs">DRY RUN</Badge>}
            </div>
            {result.results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-2 border rounded-lg">
                {r.resolved ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-gray-500">{r.resolution}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{r.type}</Badge>
              </div>
            ))}
            {result.results.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">No auto-resolvable items found.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}