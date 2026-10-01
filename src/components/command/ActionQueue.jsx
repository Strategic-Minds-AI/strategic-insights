import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, AlertCircle, ArrowRight } from 'lucide-react';

export default function ActionQueue({ actions, alerts }) {
  const priorityColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const sorted = [...actions].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] || 4) - (order[b.priority] || 4);
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-600" />
          Action Queue
          <Badge variant="secondary" className="ml-auto">{actions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-auto">
        {alerts.filter(a => a.severity === 'critical').map((a, i) => (
          <div key={`alert-${i}`} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-red-900">{a.title}</p>
              <p className="text-xs text-red-600">{a.message}</p>
            </div>
          </div>
        ))}
        {sorted.length === 0 && alerts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No actions. Add a domain to generate recommendations.</p>
        ) : (
          sorted.map(a => (
            <div key={a.id} className="border rounded-lg p-2.5 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium leading-tight">{a.title}</p>
                <Badge className={`${priorityColors[a.priority] || priorityColors.low} shrink-0 text-xs`}>{a.priority}</Badge>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{a.description}</p>
              {a.domain && <p className="text-xs text-indigo-500 mt-1">{a.domain}</p>}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}