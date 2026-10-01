import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';

export default function ActivityFilters({ filters, onFilterChange, onSaveView }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Filters</CardTitle>
          <Button variant="ghost" size="sm" onClick={onSaveView}>
            Save All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-semibold mb-3 block">Activity Type</Label>
          <div className="space-y-2">
            {['Call', 'Email', 'Meeting', 'WhatsApp'].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox 
                  id={type}
                  checked={filters.types?.includes(type)}
                  onCheckedChange={(checked) => {
                    const newTypes = checked 
                      ? [...(filters.types || []), type]
                      : (filters.types || []).filter(t => t !== type);
                    onFilterChange('types', newTypes);
                  }}
                />
                <label htmlFor={type} className="text-sm cursor-pointer">{type}</label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Owner</Label>
          <Select value={filters.owner} onValueChange={(value) => onFilterChange('owner', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              <SelectItem value="john">John Kuy</SelectItem>
              <SelectItem value="see-all">See all</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Status</Label>
          <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Last 7 Days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2">
          <Button variant="outline" className="w-full text-sm">
            More Filters (1)
          </Button>
          <Button className="w-full mt-2 bg-blue-600 hover:bg-blue-700">
            Filter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}