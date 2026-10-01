import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function ImportContactsDialog({ open, onOpenChange, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploading(false);
      setExtracting(true);

      const jsonSchema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            company: { type: 'string' },
            position: { type: 'string' },
            source: { type: 'string' }
          }
        }
      };

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: jsonSchema
      });

      setExtracting(false);

      if (extractResult.status === 'success' && extractResult.output) {
        const contacts = Array.isArray(extractResult.output) ? extractResult.output : [extractResult.output];
        
        const validContacts = contacts.filter(c => c.name && c.email);
        
        if (validContacts.length > 0) {
          await base44.entities.Contact.bulkCreate(
            validContacts.map(c => ({
              name: c.name,
              email: c.email,
              phone: c.phone || '',
              company: c.company || '',
              position: c.position || '',
              source: c.source || 'email',
              priority: 'Standard',
              status: 'active'
            }))
          );

          setResult({
            success: true,
            count: validContacts.length,
            message: `Successfully imported ${validContacts.length} contact${validContacts.length > 1 ? 's' : ''}`
          });

          setTimeout(() => {
            onImportComplete?.();
            onOpenChange(false);
            setFile(null);
            setResult(null);
          }, 2000);
        } else {
          setResult({
            success: false,
            message: 'No valid contacts found. Make sure your file has name and email columns.'
          });
        }
      } else {
        setResult({
          success: false,
          message: extractResult.details || 'Failed to extract contacts from file'
        });
      }
    } catch (error) {
      setExtracting(false);
      setResult({
        success: false,
        message: 'Failed to import contacts. Please try again.'
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFile(null);
    setResult(null);
    setUploading(false);
    setExtracting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file with contact information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!result ? (
            <>
              <div className="space-y-2">
                <Label>Select File</Label>
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {file ? file.name : 'Click to upload CSV or Excel'}
                      </p>
                      <p className="text-xs text-gray-400">CSV, XLS, XLSX</p>
                    </div>
                    <input
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {file && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-900 flex-1">{file.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <p className="font-semibold">Required columns:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>name</li>
                  <li>email</li>
                </ul>
                <p className="font-semibold mt-2">Optional columns:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>phone, company, position, source</li>
                </ul>
              </div>
            </>
          ) : (
            <div className={`flex items-center gap-3 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <p className={`text-sm font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.message}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {result?.success ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button 
              onClick={handleImport} 
              disabled={!file || uploading || extracting}
            >
              {uploading ? 'Uploading...' : extracting ? 'Processing...' : 'Import'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}