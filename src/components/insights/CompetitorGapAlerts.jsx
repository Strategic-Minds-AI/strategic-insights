import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, AlertTriangle, TrendingDown, FileSearch } from 'lucide-react';

export default function CompetitorGapAlerts({ scans }) {
  const alerts = (scans || []).filter(s => s.content_gaps || s.keyword_gaps);

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="w-4 h-4 text-orange-500" /> Competitor Gap Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-sm text-gray-400">
            No competitor scans yet. Run the domain pipeline to detect content and keyword gaps.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Swords className="w-4 h-4 text-orange-500" /> Competitor Gap Alerts
          <Badge variant="secondary" className="ml-1">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((s, i) => (
          <div key={i} className="p-3 rounded-lg border bg-orange-50/30 border-orange-100">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">{s.competitor_name || s.competitor_url}</p>
                <p className="text-xs text-gray-400">vs {s.domain}</p>
              </div>
              <a href={s.competitor_url} target="_blank" rel="noreferrer"
                className="text-xs text-indigo-500 hover:underline shrink-0">
                Visit →
              </a>
            </div>

            {s.content_gaps && (
              <div className="flex items-start gap-2 mb-1.5">
                <FileSearch className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-600">{s.content_gaps}</p>
              </div>
            )}
            {s.keyword_gaps && (
              <div className="flex items-start gap-2">
                <TrendingDown className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-600">{s.keyword_gaps}</p>
              </div>
            )}
            {s.strengths && (
              <div className="flex items-start gap-2 mt-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-500">Strengths: {s.strengths}</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}