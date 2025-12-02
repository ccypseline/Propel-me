import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Upload, Download, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function CSVUploadDialog({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);

  const downloadSampleCSV = () => {
    const sampleData = `first_name,last_name,email,company,position,linkedin_url,location,industry
John,Smith,john.smith@example.com,Tech Corp,Senior Engineer,https://linkedin.com/in/johnsmith,San Francisco,Technology
Sarah,Johnson,sarah.j@example.com,Design Studio,Creative Director,https://linkedin.com/in/sarahj,New York,Design
Michael,Brown,mbrown@example.com,Consulting Inc,Principal Consultant,https://linkedin.com/in/michaelbrown,London,Consulting`;

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_contacts.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress({ stage: 'uploading', message: 'Uploading CSV file...' });

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setProgress({ stage: 'processing', message: 'Processing contacts...' });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              first_name: { type: "string" },
              last_name: { type: "string" },
              email: { type: "string" },
              company: { type: "string" },
              position: { type: "string" },
              linkedin_url: { type: "string" },
              location: { type: "string" },
              industry: { type: "string" }
            },
            required: ["first_name", "last_name"]
          }
        }
      });

      if (result.status === 'error') {
        throw new Error(result.details || 'Could not process CSV file');
      }

      if (!result.output || !Array.isArray(result.output)) {
        throw new Error('Invalid CSV format - expected array of contacts');
      }

      const contacts = result.output;
      const contactsToImport = contacts
        .filter(c => c.first_name && c.last_name)
        .map(contact => ({
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email || '',
          company: contact.company || '',
          position: contact.position || '',
          linkedin_url: contact.linkedin_url || '',
          location: contact.location || '',
          industry: contact.industry || '',
          warmth_score: 'cold',
          relevance_score: 'medium',
          total_interactions: 0
        }));

      setProgress({ 
        stage: 'importing', 
        message: `Importing ${contactsToImport.length} contacts...` 
      });

      // Use bulkCreate instead of creating one by one
      await base44.entities.Contact.bulkCreate(contactsToImport);
      
      setProgress({ 
        stage: 'complete', 
        message: `Successfully imported ${contactsToImport.length} contacts!` 
      });
      
      toast.success(`Imported ${contactsToImport.length} contacts!`);
      
      setTimeout(() => {
        setOpen(false);
        setProgress(null);
        onSuccess?.();
      }, 2000);
      
    } catch (error) {
      console.error('Import error:', error);
      setProgress({ 
        stage: 'error', 
        message: error.message || 'Error importing contacts. Please check your CSV format.' 
      });
      toast.error('Error importing contacts');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5" />
            Import Contacts from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import your LinkedIn connections or other contacts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">CSV Format Requirements:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Include columns: <code className="bg-blue-100 px-1 rounded">first_name</code>, <code className="bg-blue-100 px-1 rounded">last_name</code></li>
              <li>• Optional: email, company, position, linkedin_url, location, industry</li>
              <li>• First row should be column headers</li>
              <li>• Use comma (,) as separator</li>
            </ul>
          </div>

          {/* Sample Download */}
          <Button 
            variant="outline" 
            onClick={downloadSampleCSV}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Sample CSV
          </Button>

          {/* File Upload */}
          {!uploading && !progress ? (
            <label className="block">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="font-medium text-slate-700 mb-1">
                  Click to upload CSV file
                </p>
                <p className="text-sm text-slate-500">
                  or drag and drop here
                </p>
              </div>
            </label>
          ) : (
            <div className="border-2 border-slate-200 rounded-lg p-8 text-center">
              {progress?.stage === 'complete' ? (
                <div className="space-y-3">
                  <CheckCircle className="w-12 h-12 mx-auto text-emerald-600" />
                  <p className="font-semibold text-emerald-700">{progress.message}</p>
                </div>
              ) : progress?.stage === 'error' ? (
                <div className="space-y-3">
                  <AlertCircle className="w-12 h-12 mx-auto text-red-600" />
                  <p className="font-semibold text-red-700">{progress.message}</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setProgress(null)}
                    className="mt-4"
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
                  <p className="font-semibold text-slate-700">{progress?.message}</p>
                </div>
              )}
            </div>
          )}

          {/* LinkedIn Instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-2 text-sm">
              How to export from LinkedIn:
            </h4>
            <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
              <li>Go to LinkedIn Settings & Privacy</li>
              <li>Click "Data privacy"</li>
              <li>Select "Get a copy of your data"</li>
              <li>Choose "Connections" and request archive</li>
              <li>Download and upload the CSV file here</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}