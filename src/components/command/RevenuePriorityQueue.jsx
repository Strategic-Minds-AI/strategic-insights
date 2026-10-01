import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, ListOrdered, ArrowRight } from 'lucide-react';

export default function RevenuePriorityQueue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
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

  const queue = data?.insights?.priority_queue || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" /> Revenue-Ranked Priority Queue
          </CardTitle>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <ListOrdered className="w-3.5 h-3.5 mr-1" />}
            {loading ? 'Ranking...' : 'Rank by $'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-auto">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!data && !loading && !error && (
          <p className="text-sm text-gray-400 text-center py-4">Run ranking to prioritize all actions by estimated revenue impact.</p>
        )}
        {queue.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">
              {item.revenue_rank || i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs">{item.source_type}</Badge>
                <span className="text-xs text-gray-400">{item.current_priority}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-medium text-green-600">{item.estimated_revenue_impact}</p>
            </div>
          </div>
        ))}
        {queue.length === 0 && data && !loading && (
          <p className="text-sm text-gray-400 text-center py-4">No items to rank yet.</p>
        )}
      </CardContent>
    </Card>
  );
}