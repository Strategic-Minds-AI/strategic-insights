import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Plus, Sparkles, Database, Zap } from 'lucide-react';

export default function SelfDiscovery({ discovery }) {
  if (!discovery) return null;
  const { connected_sources, missing_sources, data_completeness, entity_coverage, entity_counts, self_build_plan } = discovery;

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Self-Building Engine
          <Badge className="ml-auto bg-indigo-600">{data_completeness}% connected</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Completeness bars */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Data Sources</span>
              <span className="font-medium">{connected_sources.length}/{connected_sources.length + missing_sources.length}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${data_completeness}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Entity Coverage</span>
              <span className="font-medium">{entity_coverage}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${entity_coverage}%` }} />
            </div>
          </div>
        </div>

        {/* Connected sources */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Connected Intelligence Sources</p>
          <div className="flex flex-wrap gap-1">
            {connected_sources.map(s => (
              <Badge key={s} variant="secondary" className="text-xs gap-1 bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3" /> {s.replace(/_/g, ' ')}
              </Badge>
            ))}
            {missing_sources.map(s => (
              <Badge key={s} variant="outline" className="text-xs gap-1 text-gray-400">
                <Circle className="w-3 h-3" /> {s.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Self-build plan */}
        {self_build_plan && self_build_plan.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> AI-Recommended Next Connections
            </p>
            <div className="space-y-1.5">
              {self_build_plan.map((s, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-white/60 rounded-lg border border-indigo-100">
                  <Plus className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium capitalize">{s.source?.replace(/_/g, ' ') || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{s.reason}</p>
                    {s.expected_insight && <p className="text-xs text-indigo-500 mt-0.5">→ {s.expected_insight}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entity data inventory */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
            <Database className="w-3 h-3" /> Data Inventory
          </p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(entity_counts || {}).filter(([, v]) => v > 0).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs p-1.5 bg-white/40 rounded">
                <span className="text-gray-600">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

[executed on device: JARVIS-COMMAND (68702b78-725a-4b76-878f-f1693f485414)]