import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Linkedin, Loader2, Upload, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function LinkedInImport({ onProfileExtracted }) {
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [extracting, setExtracting] = useState(false);

  const extractFromLinkedIn = async () => {
    if (!linkedinUrl.trim()) {
      toast.error('Please enter a LinkedIn URL');
      return;
    }

    setExtracting(true);
    try {
      toast.info('Fetching LinkedIn profile...', { duration: 3000 });

      const extractionPrompt = `Extract professional profile information from this LinkedIn profile URL: ${linkedinUrl}

Please search the web for this LinkedIn profile and extract all available information.

Return a comprehensive professional profile with:
- Full name
- Current headline/title
- Professional summary
- Work experience (company, title, dates, responsibilities)
- Education (institution, degree, field of study, graduation year)
- Skills
- Location
- Any certifications or achievements mentioned

Be thorough and extract as much detail as possible.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: extractionPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            full_name: { type: "string" },
            headline: { type: "string" },
            summary: { type: "string" },
            location: { type: "string" },
            work_experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  company: { type: "string" },
                  title: { type: "string" },
                  start_date: { type: "string" },
                  end_date: { type: "string" },
                  current: { type: "boolean" },
                  description: { type: "string" }
                }
              }
            },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  institution: { type: "string" },
                  degree: { type: "string" },
                  field_of_study: { type: "string" },
                  graduation_year: { type: "string" }
                }
              }
            },
            skills: {
              type: "array",
              items: { type: "string" }
            },
            certifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  issuer: { type: "string" }
                }
              }
            }
          }
        }
      });

      onProfileExtracted?.(result);
      toast.success('LinkedIn profile imported successfully!');
      setLinkedinUrl('');
    } catch (error) {
      console.error('LinkedIn import error:', error);
      toast.error('Failed to import LinkedIn profile. Try uploading your resume instead.');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Linkedin className="w-5 h-5 text-blue-600" />
          Import from LinkedIn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>LinkedIn Profile URL</Label>
          <div className="flex gap-2">
            <Input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/yourprofile"
              disabled={extracting}
            />
            <Button
              onClick={extractFromLinkedIn}
              disabled={extracting || !linkedinUrl.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {extracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          We'll use AI to extract your professional information from your public LinkedIn profile
        </p>
      </CardContent>
    </Card>
  );
}