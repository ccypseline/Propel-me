import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parse } from 'date-fns';

export default function LinkedInImporter({ onComplete }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  const parseLinkedInDate = (dateStr) => {
    try {
      // Parse "07 Nov 2025" format
      return format(parse(dateStr, 'dd MMM yyyy', new Date()), 'yyyy-MM-dd');
    } catch (error) {
      return format(new Date(), 'yyyy-MM-dd');
    }
  };

  const calculateRelevanceScore = (contact, userProfile) => {
    if (!userProfile) return 50;

    let score = 0;

    // Industry Fit (max 40)
    if (userProfile.target_industries?.length > 0 && contact.industry) {
      const industryMatch = userProfile.target_industries.some(industry =>
        contact.industry.toLowerCase().includes(industry.toLowerCase()) ||
        industry.toLowerCase().includes(contact.industry.toLowerCase())
      );
      score += industryMatch ? 40 : 0;

      if (!industryMatch) {
        const partialMatch = userProfile.target_industries.some(industry =>
          contact.industry.toLowerCase().split(' ').some(word =>
            industry.toLowerCase().includes(word) || word.includes(industry.toLowerCase())
          )
        );
        score += partialMatch ? 20 : 0;
      }
    }

    // Role/Department Fit (max 25)
    if (userProfile.dream_roles?.length > 0 && contact.current_title) {
      const roleMatch = userProfile.dream_roles.some(role =>
        contact.current_title.toLowerCase().includes(role.toLowerCase())
      );
      score += roleMatch ? 25 : 0;
    } else if (userProfile.preferred_departments?.length > 0 && contact.current_title) {
      const deptMatch = userProfile.preferred_departments.some(dept =>
        contact.current_title.toLowerCase().includes(dept.toLowerCase())
      );
      score += deptMatch ? 15 : 0;
    }

    // Location Fit (max 25)
    if (userProfile.preferred_locations?.length > 0 && contact.location) {
      const locationMatch = userProfile.preferred_locations.some(loc =>
        contact.location.toLowerCase().includes(loc.toLowerCase()) ||
        loc.toLowerCase().includes(contact.location.toLowerCase())
      );
      score += locationMatch ? 25 : 0;

      if (!locationMatch && userProfile.work_eligibility_countries?.length > 0) {
        const countryMatch = userProfile.work_eligibility_countries.some(country =>
          contact.location.toLowerCase().includes(country.toLowerCase())
        );
        score += countryMatch ? 10 : 0;
      }
    }

    // Bonus (max 10)
    if (userProfile.wishlist_companies?.length > 0 && contact.current_company) {
      const companyMatch = userProfile.wishlist_companies.some(company =>
        contact.current_company.toLowerCase().includes(company.toLowerCase())
      );
      score += companyMatch ? 10 : 0;
    }

    return Math.min(Math.max(score, 0), 100);
  };

  const calculateWarmthScore = (daysSinceInteraction) => {
    if (daysSinceInteraction <= 30) return 100;
    if (daysSinceInteraction <= 90) return 70;
    if (daysSinceInteraction <= 180) return 40;
    if (daysSinceInteraction <= 365) return 20;
    return 10;
  };

  const handleConnectionsUpload = async (file) => {
    setUploading(true);
    setProgress('Uploading Connections.csv...');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setProgress('Extracting contact data...');
      const extractionSchema = {
        type: "object",
        properties: {
          contacts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                first_name: { type: "string" },
                last_name: { type: "string" },
                email: { type: "string" },
                company: { type: "string" },
                position: { type: "string" },
                connected_on: { type: "string" },
                url: { type: "string" }
              }
            }
          }
        }
      };

      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: extractionSchema
      });

      if (extracted.status === 'error' || !extracted.output?.contacts) {
        throw new Error('Failed to extract contacts from CSV');
      }

      // Get user career profile
      const profiles = await base44.entities.UserCareerProfile.list();
      const userProfile = profiles[0];

      setProgress(`Creating ${extracted.output.contacts.length} contacts...`);

      const contactsToCreate = extracted.output.contacts.map(c => {
        const connectedOn = c.connected_on ? parseLinkedInDate(c.connected_on) : format(new Date(), 'yyyy-MM-dd');
        const daysSinceConnection = Math.floor((new Date() - new Date(connectedOn)) / (1000 * 60 * 60 * 24));
        
        const relevanceScore = calculateRelevanceScore({
          industry: c.company,
          current_title: c.position,
          current_company: c.company,
          location: ''
        }, userProfile);

        const warmthScore = calculateWarmthScore(daysSinceConnection);
        const overallScore = Math.round(0.7 * relevanceScore + 0.3 * warmthScore);

        return {
          first_name: c.first_name || '',
          last_name: c.last_name || '',
          full_name: `${c.first_name} ${c.last_name}`.trim(),
          email: c.email || '',
          current_company: c.company || '',
          current_title: c.position || '',
          headline: c.position || '',
          profile_url: c.url || '',
          connected_on: connectedOn,
          last_interaction_date: connectedOn,
          warmth_score: warmthScore,
          warmth_bucket: warmthScore >= 70 ? 'hot' : warmthScore >= 40 ? 'warm' : 'cold',
          relevance_score: relevanceScore,
          relevance_bucket: relevanceScore >= 80 ? 'high' : relevanceScore >= 40 ? 'medium' : 'low',
          overall_priority_score: overallScore,
          overall_priority_bucket: overallScore >= 70 ? 'A' : overallScore >= 40 ? 'B' : 'C',
          total_interactions: 1,
          tags: []
        };
      });

      await base44.entities.Contact.bulkCreate(contactsToCreate);

      // Create interaction records for connections
      setProgress('Creating interaction records...');
      const existingContacts = await base44.entities.Contact.list();
      const interactionsToCreate = [];

      for (const contact of contactsToCreate) {
        const dbContact = existingContacts.find(c => 
          c.first_name === contact.first_name && c.last_name === contact.last_name
        );
        
        if (dbContact) {
          interactionsToCreate.push({
            contact_id: dbContact.id,
            source: 'linkedin_connection',
            interaction_type: 'connection',
            interaction_date: contact.connected_on,
            strength: 1,
            raw_metadata: { imported_from: 'Connections.csv' }
          });
        }
      }

      await base44.entities.Interaction.bulkCreate(interactionsToCreate);

      toast.success(`✅ Imported ${contactsToCreate.length} contacts with relevance scoring!`);
      onComplete?.();
    } catch (error) {
      console.error(error);
      toast.error('Failed to import contacts: ' + error.message);
    }

    setUploading(false);
    setProgress('');
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Import LinkedIn Connections
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">How to Export from LinkedIn:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to LinkedIn Settings & Privacy</li>
            <li>Click "Data Privacy" → "Get a copy of your data"</li>
            <li>Select "Connections" and request archive</li>
            <li>Download and extract the Connections.csv file</li>
            <li>Upload it here</li>
          </ol>
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleConnectionsUpload(file);
            }}
            disabled={uploading}
          />
          <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            uploading
              ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
              : 'border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-50'
          }`}>
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 mx-auto mb-3 text-blue-600 animate-spin" />
                <p className="font-medium text-slate-900 mb-1">{progress}</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <p className="font-medium text-slate-900 mb-1">Click to upload Connections.csv</p>
                <p className="text-sm text-slate-500">CSV format from LinkedIn export</p>
              </>
            )}
          </div>
        </label>
      </CardContent>
    </Card>
  );
}