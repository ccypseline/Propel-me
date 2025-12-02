import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { enrichContactsBatch } from '../utils/linkedinEnrichment';
import { toast } from 'sonner';

export default function EnrichmentDialog({ contacts, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);

  const handleEnrichAll = async () => {
    // Filter contacts that need enrichment (have profile_url but missing industry/location)
    const needsEnrichment = contacts.filter(c => 
      c.profile_url && (!c.industry || !c.location)
    );

    if (needsEnrichment.length === 0) {
      toast.info('All contacts with LinkedIn URLs are already enriched!');
      return;
    }

    setEnriching(true);
    setProgress({ current: 0, total: needsEnrichment.length });
    setResults(null);

    try {
      // Get career profile
      const careerProfiles = await base44.entities.UserCareerProfile.list();
      const careerProfile = careerProfiles[0];

      // Enrich in batches
      const result = await enrichContactsBatch(
        needsEnrichment,
        careerProfile,
        (current, total, lastResult) => {
          setProgress({ current, total });
        }
      );

      setResults(result);
      toast.success(`Enriched ${result.succeeded} contacts successfully!`);
      onSuccess?.();
    } catch (error) {
      console.error('Bulk enrichment error:', error);
      toast.error('Failed to enrich contacts');
    } finally {
      setEnriching(false);
    }
  };

  const needsEnrichmentCount = contacts.filter(c => 
    c.profile_url && (!c.industry || !c.location)
  ).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Enrich from LinkedIn
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Enrich Contacts from LinkedIn
          </DialogTitle>
        </DialogHeader>

        {!enriching && !results && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-slate-700">
                This will automatically fetch professional data from LinkedIn profiles including:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-600 mt-2 space-y-1">
                <li>Current job title and company</li>
                <li>Industry sector</li>
                <li>Location</li>
                <li>Professional skills</li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm font-semibold text-slate-900">
                {needsEnrichmentCount} contacts ready for enrichment
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Only contacts with LinkedIn URLs that are missing industry or location data
              </p>
            </div>

            <Button 
              onClick={handleEnrichAll}
              disabled={needsEnrichmentCount === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Enrichment
            </Button>
          </div>
        )}

        {enriching && (
          <div className="space-y-6 py-4">
            <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
            <div className="space-y-2">
              <p className="text-center text-sm text-slate-700 font-medium">
                Enriching contacts from LinkedIn...
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Progress</span>
                <span className="font-semibold text-slate-900">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <Progress 
                value={(progress.current / progress.total) * 100} 
                className="h-3" 
              />
            </div>
            <p className="text-xs text-center text-slate-500">
              This may take a few minutes...
            </p>
          </div>
        )}

        {results && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900">
              Enrichment Complete!
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-200">
                <p className="text-3xl font-bold text-emerald-600">{results.succeeded}</p>
                <p className="text-sm text-emerald-900 mt-1">Succeeded</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                <p className="text-3xl font-bold text-red-600">{results.failed}</p>
                <p className="text-sm text-red-900 mt-1">Failed</p>
              </div>
            </div>

            <Button
              onClick={() => {
                setOpen(false);
                setResults(null);
                setProgress({ current: 0, total: 0 });
              }}
              className="w-full"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}