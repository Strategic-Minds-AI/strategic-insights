import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function TrackingGapsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('detect_tracking_gaps', {});
      if (res.error) setError(res.error);
      else setData(res);
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
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Tracking Gap Detection
          </CardTitle>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        {!data && !loading && !error && (
          <p className="text-sm text-gray-400 text-center py-4">
            Scans every GA4 property for missing web streams, disabled measurement, short data retention, disabled Google Signals, and missing GSC links.
          </p>
        )}
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}
        {data && !loading && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-gray-500 pb-2 border-b">
              <span>{data.total_sites} properties scanned</span>
              <Badge variant={data.sites_with_gaps > 0 ? 'destructive' : 'default'} className="text-xs">
                {data.sites_with_gaps} with gaps
              </Badge>
              <span>{data.total_gaps} total gaps</span>
            </div>
            {data.results.map((r, i) => (
              <div key={i} className={`p-2.5 border rounded-lg ${r.gapCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{r.name}</span>
                  {r.gapCount === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <Badge variant="destructive" className="text-xs shrink-0">{r.gapCount} gaps</Badge>
                  )}
                </div>
                {r.gaps.length > 0 && (
                  <ul className="space-y-0.5">
                    {r.gaps.map((g, j) => (
                      <li key={j} className="text-xs text-gray-600 flex items-start gap-1">
                        <span className="text-amber-500">•</span> {g}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {data.results.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No tracked GA4 properties found.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}