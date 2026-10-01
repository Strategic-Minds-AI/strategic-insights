import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle, Loader2, Link2 } from 'lucide-react';

export default function CrossSourceInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('cross_source_insights', {});
      if (res.error) setError(res.error);
      else setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const insights = data?.insights?.cross_source_insights || [];
  const chains = data?.insights?.causal_chains || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-indigo-600" /> Cross-Source Intelligence
          </CardTitle>
          <Button size="sm" variant="outline" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-auto">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!data && !loading && !error && (
          <p className="text-sm text-gray-400 text-center py-4">Run analysis to correlate insights across all your data sources.</p>
        )}
        {insights.map((insight, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{insight.title}</p>
              <Badge variant={insight.confidence === 'high' ? 'default' : 'secondary'} className="text-xs shrink-0">
                {insight.confidence || 'medium'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {(insight.sources || []).map((s, j) => (
                <Badge key={j} variant="outline" className="text-xs">{s}</Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500">{insight.correlation}</p>
            {insight.root_cause && (
              <p className="text-xs text-gray-400"><span className="font-medium">Root cause:</span> {insight.root_cause}</p>
            )}
            {insight.estimated_revenue_impact && (
              <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <TrendingUp className="w-3 h-3" /> {insight.estimated_revenue_impact}
              </div>
            )}
            {insight.recommended_action && (
              <p className="text-xs text-indigo-600"><span className="font-medium">Action:</span> {insight.recommended_action}</p>
            )}
          </div>
        ))}
        {chains.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Causal Chains
            </p>
            {chains.map((c, i) => (
              <div key={i} className="text-xs text-gray-500 py-1">
                <span className="font-mono">{c.chain}</span>
                {c.evidence && <p className="text-gray-400 ml-2">→ {c.evidence}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}