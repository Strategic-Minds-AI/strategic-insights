import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ExternalLink, AlertTriangle, ArrowRight, CheckCircle2, Lightbulb } from 'lucide-react';

const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
};

export default function GapCard({ gap, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const s = SEVERITY_STYLES[gap.severity] || SEVERITY_STYLES.medium;
  let steps = [];
  try { steps = JSON.parse(gap.ai_action_steps || '[]'); } catch {}

  return (
    <Card className={`${s.border} ${s.bg} overflow-hidden`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className={`${s.badge} text-xs`}>{gap.severity}</Badge>
              <Badge variant="outline" className="text-xs capitalize">{gap.category}</Badge>
              {gap.source && <span className="text-xs text-gray-500">via {gap.source}</span>}
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">{gap.title}</h4>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{gap.description}</p>
          </div>
          {gap.severity === 'critical' && <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
        </div>

        {(gap.metric_value || gap.benchmark_value) && (
          <div className="flex items-center gap-4 mt-3 text-xs">
            {gap.metric_value && <span className="text-gray-600">Current: <strong>{gap.metric_value}</strong></span>}
            {gap.benchmark_value && <span className="text-gray-600">Target: <strong className="text-green-600">{gap.benchmark_value}</strong></span>}
          </div>
        )}

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs">
              <Lightbulb className="w-3.5 h-3.5 mr-1 text-violet-500" />
              AI recommendation
              <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-white/70 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700">{gap.ai_recommendation}</p>
              {steps.length > 0 && (
                <ol className="mt-3 space-y-1.5">
                  {steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold shrink-0">{i + 1}</span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
              {gap.estimated_impact && (
                <p className="mt-2 text-xs text-green-700 font-medium">📈 {gap.estimated_impact}</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex items-center gap-2 mt-3">
          {gap.action_url && (
            <a href={gap.action_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="default" className="h-7 text-xs bg-violet-600 hover:bg-violet-700">
                Show me <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </a>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatusChange(gap.id, 'in_progress')}>
            <ArrowRight className="w-3 h-3 mr-1" /> Bring me
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto text-green-600" onClick={() => onStatusChange(gap.id, 'resolved')}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Close gap
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}