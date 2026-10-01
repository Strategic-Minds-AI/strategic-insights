import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Search, Target, Facebook, Zap, Users, Linkedin, Music2, Brain, CheckCircle2, Link2 } from 'lucide-react';

const ICONS = { BarChart3, Search, Target, Facebook, Zap, Users, Linkedin, Music2, Brain };

export default function PlatformGrid({ platforms, onConnect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {platforms.map(p => {
        const Icon = ICONS[p.icon] || BarChart3;
        return (
          <Card key={p.id} className={`relative ${p.connected ? 'border-violet-200 bg-violet-50/50' : 'border-gray-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${p.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: p.color }} />
                </div>
                {p.connected ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Available</Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{p.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
              <div className="mt-2">
                {p.connected ? (
                  <span className="text-xs font-medium text-green-600">Connected</span>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-violet-600" onClick={() => onConnect(p)}>
                    <Link2 className="w-3 h-3 mr-1" /> Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}