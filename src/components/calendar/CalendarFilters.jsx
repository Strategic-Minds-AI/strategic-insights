import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function CalendarFilters({ filters, onFilterChange }) {
  const eventTypes = [
    { value: 'appointment', label: 'Appointments' },
    { value: 'call', label: 'Calls' },
    { value: 'meeting', label: 'Meetings' },
    { value: 'task', label: 'Tasks' },
    { value: 'reminder', label: 'Reminders' },
    { value: 'demo', label: 'Demos' },
  ];

  const dateRanges = [
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'nextWeek', label: 'Next Week' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Filters</span>
          <button
            className="text-xs text-blue-600 hover:text-blue-700 font-normal"
            onClick={() => onFilterChange('reset')}
          >
            Clear All
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-semibold mb-3 block">Type</Label>
          <div className="space-y-2">
            {eventTypes.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={type.value}
                  checked={filters.eventTypes?.includes(type.value)}
                  onCheckedChange={(checked) => {
                    const newTypes = checked
                      ? [...(filters.eventTypes || []), type.value]
                      : (filters.eventTypes || []).filter(t => t !== type.value);
                    onFilterChange('eventTypes', newTypes);
                  }}
                />
                <label htmlFor={type.value} className="text-sm cursor-pointer">
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-3 block">Date</Label>
          <div className="space-y-2">
            {dateRanges.map((range) => (
              <div key={range.value} className="flex items-center space-x-2">
                <Checkbox
                  id={range.value}
                  checked={filters.dateRange === range.value}
                  onCheckedChange={(checked) => {
                    onFilterChange('dateRange', checked ? range.value : null);
                  }}
                />
                <label htmlFor={range.value} className="text-sm cursor-pointer">
                  {range.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}