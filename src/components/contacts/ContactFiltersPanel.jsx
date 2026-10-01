import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

export default function ContactFiltersPanel({ filters, onFilterChange, onClose }) {
  const handleCheckboxChange = (category, value) => {
    const currentValues = filters[category] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onFilterChange(category, newValues);
  };

  return (
    <div className="w-full lg:w-80 bg-white border-l h-full overflow-y-auto">
      <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
        <h3 className="font-semibold">Filters</h3>
        <Button variant="ghost" size="sm" onClick={() => onFilterChange('reset')}>
          Clear All
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Role Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {['Decision Maker', 'Key Contact', 'Influencer', 'End User', 'Other'].map((role) => (
              <div key={role} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${role}`}
                  checked={filters.roles?.includes(role)}
                  onCheckedChange={() => handleCheckboxChange('roles', role)}
                />
                <Label htmlFor={`role-${role}`} className="text-sm font-normal cursor-pointer">
                  {role}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Priority Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {['Key', 'Standard', 'At Risk'].map((priority) => (
              <div key={priority} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${priority}`}
                  checked={filters.priorities?.includes(priority)}
                  onCheckedChange={() => handleCheckboxChange('priorities', priority)}
                />
                <Label htmlFor={`priority-${priority}`} className="text-sm font-normal cursor-pointer">
                  {priority}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Activity Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="no-activity"
                checked={filters.noRecentActivity}
                onCheckedChange={() => onFilterChange('noRecentActivity', !filters.noRecentActivity)}
              />
              <Label htmlFor="no-activity" className="text-sm font-normal cursor-pointer">
                No Recent Activity (30+ days)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Company Size */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Company Size</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {['Small (1-50)', 'Medium (51-500)', 'Large (500+)'].map((size) => (
              <div key={size} className="flex items-center space-x-2">
                <Checkbox
                  id={`size-${size}`}
                  checked={filters.companySizes?.includes(size)}
                  onCheckedChange={() => handleCheckboxChange('companySizes', size)}
                />
                <Label htmlFor={`size-${size}`} className="text-sm font-normal cursor-pointer">
                  {size}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {['call', 'email', 'website', 'partner', 'referral'].map((source) => (
              <div key={source} className="flex items-center space-x-2">
                <Checkbox
                  id={`source-${source}`}
                  checked={filters.sources?.includes(source)}
                  onCheckedChange={() => handleCheckboxChange('sources', source)}
                />
                <Label htmlFor={`source-${source}`} className="text-sm font-normal cursor-pointer">
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Engagement Level */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Engagement Level</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {['High', 'Medium', 'Low'].map((level) => (
              <div key={level} className="flex items-center space-x-2">
                <Checkbox
                  id={`engagement-${level}`}
                  checked={filters.engagementLevels?.includes(level)}
                  onCheckedChange={() => handleCheckboxChange('engagementLevels', level)}
                />
                <Label htmlFor={`engagement-${level}`} className="text-sm font-normal cursor-pointer">
                  {level}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}