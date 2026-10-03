import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BusinessSwitcher({ businesses, selectedId, onSelect, onAddNew }) {
  const [open, setOpen] = useState(false);
  const selected = businesses.find(b => b.id === selectedId);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <Select value={selectedId || ''} onValueChange={onSelect}>
            <SelectTrigger className="w-56 border-0 bg-transparent p-0 h-auto focus:ring-0 text-lg font-semibold">
              <SelectValue placeholder="Select a business" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  <div className="flex items-center gap-2">
                    <span>{b.name}</span>
                    {b.ga_property_id && <span className="w-2 h-2 rounded-full bg-orange-400" />}
                    {b.search_console_site && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && (
            <p className="text-xs text-gray-500 mt-0.5">{selected.website_url || selected.industry || 'No website set'}</p>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onAddNew} className="ml-auto">
        <Plus className="w-4 h-4 mr-1" /> Business
      </Button>
    </div>
  );
}

[executed on device: JARVIS-COMMAND (68702b78-725a-4b76-878f-f1693f485414)]