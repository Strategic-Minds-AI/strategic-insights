import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, RotateCcw, Calendar, User } from 'lucide-react';

export default function GlobalFilters({ filters, onFilterChange, onExportCSV, onExportPDF, owners = [] }) {
  return (
    <Card className="p-4 mb-6 sticky top-0 z-10 bg-white shadow-md border-gray-200">
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Select value={filters.dateRange} onValueChange={(value) => onFilterChange('dateRange', value)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Date: This Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="ytd">YTD</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <Select value={filters.owner} onValueChange={(value) => onFilterChange('owner', value)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Owner: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={filters.stage} onValueChange={(value) => onFilterChange('stage', value)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Stage: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="prospecting">Prospecting</SelectItem>
              <SelectItem value="qualification">Qualification</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="closed_won">Closed Won</SelectItem>
              <SelectItem value="closed_lost">Closed Lost</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => onFilterChange('reset')}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        <div className="flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={onExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onExportPDF}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>
    </Card>
  );
}