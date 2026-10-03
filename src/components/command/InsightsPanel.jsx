import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';

export default function InsightsPanel({ insights }) {
  if (!insights) return null;

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/30 to-purple-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          AI Strategic Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.headline_insight && (
          <div className="p-3 bg-indigo-600 text-white rounded-lg">
            <p className="text-sm font-medium leading-relaxed">{insights.headline_insight}</p>
          </div>
        )}

        {insights.growth_opportunities?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" /> Growth Opportunities
            </p>
            <div className="space-y-1.5">
              {insights.growth_opportunities.map((g, i) => (
                <div key={i} className="p-2 bg-white/60 rounded-lg border border-green-100">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{g.title}</p>
                    {g.impact && <Badge className="bg-green-100 text-green-700 text-xs shrink-0">{g.impact}</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.risks?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" /> Risks to Watch
            </p>
            <div className="space-y-1.5">
              {insights.risks.map((r, i) => (
                <div key={i} className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.recommended_actions?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-yellow-500" /> Do Next
            </p>
            <div className="space-y-1.5">
              {insights.recommended_actions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-white/60 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-gray-500">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

[executed on device: JARVIS-COMMAND (68702b78-725a-4b76-878f-f1693f485414)]