import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AccountFilters({ filters, onFilterChange }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Filters</CardTitle>
          <Button variant="ghost" size="sm">Save All</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-semibold mb-2 block">Owner</Label>
          <Select value={filters.owner} onValueChange={(value) => onFilterChange('owner', value)}>
            <SelectTrigger>
              <SelectValue placeholder="John Kuy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              <SelectItem value="john">John Kuy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Industry</Label>
          <Select value={filters.industry} onValueChange={(value) => onFilterChange('industry', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Technology" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="software">Software</SelectItem>
              <SelectItem value="financial">Financial Services</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Revenue Range</Label>
          <Select value={filters.revenue} onValueChange={(value) => onFilterChange('revenue', value)}>
            <SelectTrigger>
              <SelectValue placeholder="$1M to $5M" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Revenue</SelectItem>
              <SelectItem value="0-1m">$0 - $1M</SelectItem>
              <SelectItem value="1m-5m">$1M - $5M</SelectItem>
              <SelectItem value="5m+">$5M+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-3 block">Tier</Label>
          <div className="space-y-2">
            {['Key Account', 'A', 'B', 'C'].map((tier) => (
              <div key={tier} className="flex items-center space-x-2">
                <Checkbox 
                  id={tier}
                  checked={filters.tiers?.includes(tier)}
                  onCheckedChange={(checked) => {
                    const newTiers = checked 
                      ? [...(filters.tiers || []), tier]
                      : (filters.tiers || []).filter(t => t !== tier);
                    onFilterChange('tiers', newTiers);
                  }}
                />
                <label htmlFor={tier} className="text-sm cursor-pointer">{tier}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            Filter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}