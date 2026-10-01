import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight } from 'lucide-react';

const priorityConfig = {
  critical: { color: 'text-red-600', bg: 'bg-red-100' },
  high: { color: 'text-orange-600', bg: 'bg-orange-100' },
  medium: { color: 'text-yellow-600', bg: 'bg-yellow-100' },
  low: { color: 'text-gray-500', bg: 'bg-gray-100' },
};

export default function GrowthRecommendations({ actions }) {
  const open = (actions || []).filter(a => a.status === 'open' || a.status === 'in_progress');

  if (open.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" /> Growth Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-sm text-gray-400">
            No open recommendations. Run domain scans to generate AI-powered actions.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by priority: critical > high > medium > low
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  open.sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-500" /> Growth Recommendations
          <Badge variant="secondary" className="ml-1">{open.length} open</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {open.slice(0, 10).map((a, i) => {
          const pc = priorityConfig[a.priority] || priorityConfig.medium;
          return (
            <div key={i} className="p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className={`${pc.bg} ${pc.color} shrink-0`}>{a.priority}</Badge>
                  <span className="text-xs text-gray-400 shrink-0">{a.type}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{a.domain}</span>
              </div>
              <p className="text-sm font-medium text-gray-800 mt-1">{a.title}</p>
              {a.description && <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>}
              {a.estimated_impact && (
                <div className="flex items-center gap-1 mt-2 text-xs text-indigo-600">
                  <ArrowRight className="w-3 h-3" /> {a.estimated_impact}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}