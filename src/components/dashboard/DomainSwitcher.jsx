import React from 'react';
import { Globe, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DomainSwitcher({ domains, selectedId, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      {domains.map(d => {
        const active = d.id === selectedId;
        return (
          <button
            key={d.id}
            onClick={() => onSelect(d)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border whitespace-nowrap text-sm font-medium transition-all shrink-0',
              active
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            )}
          >
            <Globe className={cn('w-4 h-4', active ? 'text-white' : 'text-gray-400')} />
            <span className="truncate max-w-[140px]">{d.domain}</span>
            {active && <Check className="w-3.5 h-3.5" />}
          </button>
        );
      })}
    </div>
  );
}