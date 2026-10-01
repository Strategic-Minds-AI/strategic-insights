import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scan, Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BusinessCardScanner({ open, onOpenChange, onContactExtracted }) {
  const [isScanning, setIsScanning] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleScan = async () => {
    if (!file) return;

    setIsScanning(true);
    try {
      // Upload the file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from the business card image
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            company: { type: 'string' },
            position: { type: 'string' }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        onContactExtracted(result.output);
        onOpenChange(false);
        setFile(null);
      } else {
        alert('Failed to extract contact information from the business card. Please try again or enter manually.');
      }
    } catch (error) {
      console.error('Error scanning business card:', error);
      alert('An error occurred while scanning the business card. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Business Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Scan className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              Upload a photo or image of the business card
            </p>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="max-w-xs mx-auto"
            />
            {file && (
              <p className="text-sm text-green-600 mt-2">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleScan} disabled={!file || isScanning}>
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Scan Card
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}