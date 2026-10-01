import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Bookmark } from 'lucide-react';

export default function SavedReportsDialog({ open, onOpenChange, currentFilters, onSaveReport, savedReports = [] }) {
  const [reportName, setReportName] = useState('');
  const [selectedColumns, setSelectedColumns] = useState({
    name: true,
    account: true,
    owner: true,
    value: true,
    stage: true,
    wonDate: true,
  });

  const handleSave = () => {
    if (!reportName.trim()) return;
    
    onSaveReport({
      id: Date.now().toString(),
      name: reportName,
      filters: currentFilters,
      columns: selectedColumns,
      createdAt: new Date().toISOString(),
    });
    
    setReportName('');
    onOpenChange(false);
  };

  const handleLoadReport = (report) => {
    onSaveReport(report, true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Custom Report View</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Save New Report */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="reportName">Report Name</Label>
              <Input
                id="reportName"
                placeholder="e.g., Q1 Won Deals by Region"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="mb-3 block">Select Columns to Display</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries({
                  name: 'Name',
                  account: 'Account',
                  owner: 'Owner',
                  value: 'Value',
                  stage: 'Stage',
                  wonDate: 'Won Date',
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={selectedColumns[key]}
                      onCheckedChange={(checked) =>
                        setSelectedColumns(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                    <label htmlFor={key} className="text-sm cursor-pointer">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Current Filters:</strong> Date Range: {currentFilters.dateRange}, 
                Stage: {currentFilters.stage}, Owner: {currentFilters.owner || 'All'}
              </p>
            </div>
          </div>

          {/* Saved Reports List */}
          {savedReports.length > 0 && (
            <div className="border-t pt-4">
              <Label className="mb-3 block">Saved Reports</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">{report.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadReport(report)}
                    >
                      Load
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!reportName.trim()}>
            <Save className="w-4 h-4 mr-2" />
            Save Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}