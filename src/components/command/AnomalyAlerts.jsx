import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2, Activity, TrendingDown, TrendingUp } from 'lucide-react';

export default function AnomalyAlerts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('detect_anomalies', {});
      if (res.error) setError(res.error);
      else setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const anomalies = data?.anomalies || [];

  const severityColor = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" /> Anomaly Detection
            {anomalies.length > 0 && (
              <Badge variant="destructive" className="text-xs">{anomalies.length}</Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-72 overflow-auto">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {loading && <p className="text-sm text-gray-400 text-center py-4">Detecting anomalies...</p>}
        {!loading && anomalies.length === 0 && !error && (
          <p className="text-sm text-gray-400 text-center py-4">No anomalies detected. All metrics within normal range.</p>
        )}
        {anomalies.map((a, i) => (
          <div key={i} className={`border rounded-lg p-2.5 ${severityColor[a.severity] || severityColor.medium}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {a.direction === 'drop' ? <TrendingDown className="w-3.5 h-3.5 shrink-0" /> : <TrendingUp className="w-3.5 h-3.5 shrink-0" />}
                  <p className="text-sm font-medium truncate">{a.domain || a.source}</p>
                </div>
                <p className="text-xs mt-0.5">{a.description}</p>
                {a.z_score !== undefined && (
                  <p className="text-xs opacity-70 mt-0.5">{a.z_score}σ from baseline {a.historical_mean}</p>
                )}
              </div>
              <Badge variant="outline" className={`text-xs shrink-0 ${severityColor[a.severity] || ''}`}>
                {a.severity}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}