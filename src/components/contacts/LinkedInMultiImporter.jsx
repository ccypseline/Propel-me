import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, FileText, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { calculateWarmthScore, calculateRelevanceScore, calculateOverallPriority } from '../utils/scoringUtils';
import { trackWarmthChange } from '../utils/warmthTracking';

function getSchemaForType(type) {
  switch (type) {
    case CSV_TYPES.CONNECTIONS:
      return {
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
      };
    case CSV_TYPES.MESSAGES:
      return {
        type: "array",
        items: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            date: { type: "string" },
            content: { type: "string" }
          }
        }
      };
    case CSV_TYPES.INVITATIONS:
      return {
        type: "array",
        items: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            sent_at: { type: "string" },
            direction: { type: "string" }
          }
        }
      };
    case CSV_TYPES.ENDORSEMENTS_RECEIVED:
      return {
        type: "array",
        items: {
          type: "object",
          properties: {
            endorsement_date: { type: "string" },
            skill_name: { type: "string" },
            endorser_first_name: { type: "string" },
            endorser_last_name: { type: "string" },
            endorser_public_url: { type: "string" }
          }
        }
      };
    case CSV_TYPES.ENDORSEMENTS_GIVEN:
      return {
        type: "array",
        items: {
          type: "object",
          properties: {
            endorsement_date: { type: "string" },
            skill_name: { type: "string" },
            endorsee_first_name: { type: "string" },
            endorsee_last_name: { type: "string" },
            endorsee_public_url: { type: "string" }
          }
        }
      };
    case CSV_TYPES.RECOMMENDATIONS_RECEIVED:
    case CSV_TYPES.RECOMMENDATIONS_GIVEN:
      return {
        type: "array",
        items: {
          type: "object",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            creation_date: { type: "string" },
            text: { type: "string" }
          }
        }
      };
    default:
      return {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            date: { type: "string" }
          }
        }
      };
  }
}

const CSV_TYPES = {
  CONNECTIONS: 'Connections',
  MESSAGES: 'Messages',
  INVITATIONS: 'Invitations',
  PROFILE_VIEWS: 'Profile Views',
  ENDORSEMENTS_RECEIVED: 'Endorsements Received',
  ENDORSEMENTS_GIVEN: 'Endorsements Given',
  RECOMMENDATIONS_RECEIVED: 'Recommendations Received',
  RECOMMENDATIONS_GIVEN: 'Recommendations Given'
};

const EXPECTED_HEADERS = {
  [CSV_TYPES.CONNECTIONS]: ['first name', 'last name', 'url', 'email address', 'company', 'position', 'connected on'],
  [CSV_TYPES.MESSAGES]: ['conversation id', 'from', 'to', 'date'],
  [CSV_TYPES.INVITATIONS]: ['from', 'to', 'sent at', 'direction'],
  [CSV_TYPES.ENDORSEMENTS_RECEIVED]: ['endorsement date', 'skill name', 'endorser first name', 'endorser last name', 'endorser public url'],
  [CSV_TYPES.ENDORSEMENTS_GIVEN]: ['endorsement date', 'skill name', 'endorsee first name', 'endorsee last name', 'endorsee public url'],
  [CSV_TYPES.RECOMMENDATIONS_RECEIVED]: ['first name', 'last name', 'creation date'],
  [CSV_TYPES.RECOMMENDATIONS_GIVEN]: ['first name', 'last name', 'creation date']
};

const FILE_CHECKLIST = [
  { type: CSV_TYPES.CONNECTIONS, fileName: 'Connections.csv', required: true },
  { type: CSV_TYPES.MESSAGES, fileName: 'messages.csv', required: false },
  { type: CSV_TYPES.INVITATIONS, fileName: 'Invitations.csv', required: false },
  { type: CSV_TYPES.ENDORSEMENTS_RECEIVED, fileName: 'Endorsement_Received_Info.csv', required: false },
  { type: CSV_TYPES.ENDORSEMENTS_GIVEN, fileName: 'Endorsement_Given_Info.csv', required: false },
  { type: CSV_TYPES.RECOMMENDATIONS_RECEIVED, fileName: 'Recommendations_Received.csv', required: false },
  { type: CSV_TYPES.RECOMMENDATIONS_GIVEN, fileName: 'Recommendations_Given.csv', required: false },
  { type: 'Reactions', fileName: 'Reactions.csv', required: false }
];

export default function LinkedInMultiImporter({ onSuccess }) {
  const [fileStatuses, setFileStatuses] = useState(
    FILE_CHECKLIST.map(item => ({ ...item, status: 'missing', file: null, error: null }))
  );
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [results, setResults] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    const updatedStatuses = [...fileStatuses];
    
    selectedFiles.forEach(file => {
      const nameLower = file.name.toLowerCase();
      let matchedIndex = -1;
      let detectedType = null;
      
      // Match file to expected types
      if (nameLower.includes('connections')) {
        matchedIndex = updatedStatuses.findIndex(s => s.type === CSV_TYPES.CONNECTIONS);
        detectedType = CSV_TYPES.CONNECTIONS;
      } else if (nameLower.includes('message')) {
        matchedIndex = updatedStatuses.findIndex(s => s.type === CSV_TYPES.MESSAGES);
        detectedType = CSV_TYPES.MESSAGES;
      } else if (nameLower.includes('invitation')) {
        matchedIndex = updatedStatuses.findIndex(s => s.type === CSV_TYPES.INVITATIONS);
        detectedType = CSV_TYPES.INVITATIONS;
      } else if (nameLower.includes('endorsement') && nameLower.includes('received')) {
        matchedIndex = updatedStatuses.findIndex(s => s.type === CSV_TYPES.ENDORSEMENTS_RECEIVED);
        detectedType = CSV_TYPES.ENDORSEMENTS_RECEIVED;
      } else if (nameLower.includes('endorsement') && nameLower.includes('given')) {
        matchedIndex = updatedStatuses.findIndex(s => s.type === CSV_TYPES.ENDORSEMENTS_GIVEN);
        detectedType = CSV_TYPES.ENDORSEMENTS_GIVEN;
      } else if (nameLower.includes('recommendation') && nameLower.includes('received')) {
        matchedIndex = updatedStatuses.findIndex(s => s.type === CSV_TYPES.RECOMMENDATIONS_RECEIVED);
        detectedType = CSV_TYPES.RECOMMENDATIONS_RECEIVED;
      } else if (nameLower.includes('recommendation') && nameLower.includes('given')) {
        matchedIndex = updatedStatuses.findIndex(s => s.type === CSV_TYPES.RECOMMENDATIONS_GIVEN);
        detectedType = CSV_TYPES.RECOMMENDATIONS_GIVEN;
      } else if (nameLower.includes('reaction')) {
        matchedIndex = updatedStatuses.findIndex(s => s.type === 'Reactions');
        detectedType = 'Reactions';
      }
      
      if (matchedIndex >= 0 && file.name.endsWith('.csv')) {
        updatedStatuses[matchedIndex] = {
          ...updatedStatuses[matchedIndex],
          status: 'uploaded',
          file: file,
          error: null
        };
      } else {
        // Invalid file - add to list with error
        updatedStatuses.push({
          type: 'invalid',
          fileName: file.name,
          required: false,
          status: 'invalid',
          file: file,
          error: file.name.endsWith('.csv') ? 'File name not recognized' : 'Not a CSV file'
        });
      }
    });
    
    setFileStatuses(updatedStatuses);
  };

  const handleImport = async () => {
    const hasConnections = fileStatuses.some(f => f.type === CSV_TYPES.CONNECTIONS && f.status === 'uploaded');
    
    if (!hasConnections) {
      toast.error('Connections.csv is required to import contacts');
      return;
    }

    setImporting(true);
    setProgress(0);
    setProgressMessage('Starting import...');
    
    try {
      // Get user career profile and settings
      const careerProfiles = await base44.entities.UserCareerProfile.list();
      const careerProfile = careerProfiles[0];
      
      const settingsList = await base44.entities.UserSettings.list();
      const settings = settingsList[0];
      const badgeStartDate = settings?.badge_start_date;

      // Step 1: Upload and extract all files
      setProgressMessage('📤 Uploading and validating files...');
      const uploadedData = [];
      const validFiles = fileStatuses.filter(f => f.status === 'uploaded' && f.file);
      
      for (let i = 0; i < validFiles.length; i++) {
        const fileStatus = validFiles[i];
        setProgress((i / (validFiles.length * 3)) * 100);
        setProgressMessage(`📤 Processing ${fileStatus.fileName}...`);
        
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: fileStatus.file });
          
          const schema = getSchemaForType(fileStatus.type);

          const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: schema
          });

          if (extracted.status === 'success' && extracted.output) {
            uploadedData.push({ 
              type: fileStatus.type, 
              data: extracted.output,
              fileName: fileStatus.fileName 
            });
            
            // Update status to success
            setFileStatuses(prev => prev.map(f => 
              f.fileName === fileStatus.fileName 
                ? { ...f, status: 'success' }
                : f
            ));
          } else {
            // Mark as failed
            setFileStatuses(prev => prev.map(f => 
              f.fileName === fileStatus.fileName 
                ? { ...f, status: 'failed', error: 'Failed to parse CSV data' }
                : f
            ));
          }
        } catch (error) {
          setFileStatuses(prev => prev.map(f => 
            f.fileName === fileStatus.fileName 
              ? { ...f, status: 'failed', error: error.message || 'Unknown error' }
              : f
          ));
        }
      }

      // Step 2: Process and merge data
      setProgressMessage('🔄 Processing and merging contacts...');
      setProgress(33);

      const contactsMap = new Map();
      const interactionsMap = new Map();

      // Process connections
      for (const upload of uploadedData.filter(u => u.type === CSV_TYPES.CONNECTIONS)) {
        for (const row of upload.data) {
          if (!row.first_name || !row.last_name) continue;
          
          const key = `${row.first_name.toLowerCase()}_${row.last_name.toLowerCase()}`;
          
          if (!contactsMap.has(key)) {
            contactsMap.set(key, {
              first_name: row.first_name,
              last_name: row.last_name,
              full_name: `${row.first_name} ${row.last_name}`,
              email: row.email || '',
              current_company: row.company || '',
              current_title: row.position || '',
              profile_url: row.url || '',
              connected_on: row.connected_on || '',
              last_interaction_date: row.connected_on || '',
              interactions: []
            });
          }
        }
      }

      // Process messages (strength: 3)
      for (const upload of uploadedData.filter(u => u.type === CSV_TYPES.MESSAGES)) {
        for (const row of upload.data) {
          const names = [row.from, row.to].filter(n => n);
          for (const name of names) {
            const parts = name.trim().split(' ');
            if (parts.length >= 2) {
              const key = `${parts[0].toLowerCase()}_${parts[parts.length - 1].toLowerCase()}`;
              if (contactsMap.has(key)) {
                const contact = contactsMap.get(key);
                contact.interactions.push({
                  type: 'direct_message',
                  date: row.date,
                  strength: 3
                });
                
                if (!contact.last_interaction_date || new Date(row.date) > new Date(contact.last_interaction_date)) {
                  contact.last_interaction_date = row.date;
                }
              }
            }
          }
        }
      }

      // Process invitations (strength: 1)
      for (const upload of uploadedData.filter(u => u.type === CSV_TYPES.INVITATIONS)) {
        for (const row of upload.data) {
          const names = [row.from, row.to].filter(n => n);
          for (const name of names) {
            const parts = name.trim().split(' ');
            if (parts.length >= 2) {
              const key = `${parts[0].toLowerCase()}_${parts[parts.length - 1].toLowerCase()}`;
              if (contactsMap.has(key)) {
                const contact = contactsMap.get(key);
                contact.interactions.push({
                  type: row.direction === 'OUTGOING' ? 'invitation_sent' : 'invitation_received',
                  date: row.sent_at || row.date,
                  strength: 1
                });
                
                const interactionDate = row.sent_at || row.date;
                if (interactionDate && (!contact.last_interaction_date || new Date(interactionDate) > new Date(contact.last_interaction_date))) {
                  contact.last_interaction_date = interactionDate;
                }
              }
            }
          }
        }
      }

      // Process endorsements received (strength: 2)
      for (const upload of uploadedData.filter(u => u.type === CSV_TYPES.ENDORSEMENTS_RECEIVED)) {
        for (const row of upload.data) {
          if (!row.endorser_first_name || !row.endorser_last_name) continue;
          const key = `${row.endorser_first_name.toLowerCase()}_${row.endorser_last_name.toLowerCase()}`;
          
          if (contactsMap.has(key)) {
            const contact = contactsMap.get(key);
            contact.interactions.push({
              type: 'endorsement_received',
              date: row.endorsement_date,
              strength: 2,
              metadata: { skill: row.skill_name }
            });
            
            if (row.endorsement_date && (!contact.last_interaction_date || new Date(row.endorsement_date) > new Date(contact.last_interaction_date))) {
              contact.last_interaction_date = row.endorsement_date;
            }
          }
        }
      }

      // Process endorsements given (strength: 2)
      for (const upload of uploadedData.filter(u => u.type === CSV_TYPES.ENDORSEMENTS_GIVEN)) {
        for (const row of upload.data) {
          if (!row.endorsee_first_name || !row.endorsee_last_name) continue;
          const key = `${row.endorsee_first_name.toLowerCase()}_${row.endorsee_last_name.toLowerCase()}`;
          
          if (contactsMap.has(key)) {
            const contact = contactsMap.get(key);
            contact.interactions.push({
              type: 'endorsement_given',
              date: row.endorsement_date,
              strength: 2,
              metadata: { skill: row.skill_name }
            });
            
            if (row.endorsement_date && (!contact.last_interaction_date || new Date(row.endorsement_date) > new Date(contact.last_interaction_date))) {
              contact.last_interaction_date = row.endorsement_date;
            }
          }
        }
      }

      // Process recommendations received (strength: 3)
      for (const upload of uploadedData.filter(u => u.type === CSV_TYPES.RECOMMENDATIONS_RECEIVED)) {
        for (const row of upload.data) {
          if (!row.first_name || !row.last_name) continue;
          const key = `${row.first_name.toLowerCase()}_${row.last_name.toLowerCase()}`;
          
          if (contactsMap.has(key)) {
            const contact = contactsMap.get(key);
            contact.interactions.push({
              type: 'recommendation_received',
              date: row.creation_date,
              strength: 3
            });
            
            if (row.creation_date && (!contact.last_interaction_date || new Date(row.creation_date) > new Date(contact.last_interaction_date))) {
              contact.last_interaction_date = row.creation_date;
            }
          }
        }
      }

      // Process recommendations given (strength: 3)
      for (const upload of uploadedData.filter(u => u.type === CSV_TYPES.RECOMMENDATIONS_GIVEN)) {
        for (const row of upload.data) {
          if (!row.first_name || !row.last_name) continue;
          const key = `${row.first_name.toLowerCase()}_${row.last_name.toLowerCase()}`;
          
          if (contactsMap.has(key)) {
            const contact = contactsMap.get(key);
            contact.interactions.push({
              type: 'recommendation_given',
              date: row.creation_date,
              strength: 3
            });
            
            if (row.creation_date && (!contact.last_interaction_date || new Date(row.creation_date) > new Date(contact.last_interaction_date))) {
              contact.last_interaction_date = row.creation_date;
            }
          }
        }
      }

      // Step 3: Check for duplicates and calculate scores
      setProgressMessage('🔍 Checking for duplicates...');
      setProgress(60);

      const existingContacts = await base44.entities.Contact.list();
      const existingEmails = new Set(existingContacts.map(c => c.email?.toLowerCase()).filter(e => e));
      const existingNames = new Set(existingContacts.map(c => 
        `${c.first_name?.toLowerCase()}_${c.last_name?.toLowerCase()}`
      ));

      setProgressMessage('🎯 Calculating relevance and warmth scores...');
      setProgress(66);

      const contactsToCreate = [];
      const interactionsToCreate = [];
      let duplicatesSkipped = 0;

      for (const [key, contactData] of contactsMap.entries()) {
        // Skip if duplicate by name
        if (existingNames.has(key)) {
          duplicatesSkipped++;
          continue;
        }

        // Skip if duplicate by email
        if (contactData.email && existingEmails.has(contactData.email.toLowerCase())) {
          duplicatesSkipped++;
          continue;
        }

        const warmth = calculateWarmthScore(contactData.last_interaction_date);
        const relevance = calculateRelevanceScore(contactData, careerProfile);
        const priority = calculateOverallPriority(relevance.score, warmth.score);

        // Track warmth for new contact (no previous state, so no reactivation yet)
        const warmthTracking = trackWarmthChange(
          { warmth_bucket: null, previous_warmth_bucket: null },
          warmth.bucket,
          warmth.score,
          badgeStartDate
        );

        contactsToCreate.push({
          first_name: contactData.first_name,
          last_name: contactData.last_name,
          full_name: contactData.full_name,
          email: contactData.email,
          current_company: contactData.current_company,
          current_title: contactData.current_title,
          profile_url: contactData.profile_url,
          connected_on: contactData.connected_on,
          last_interaction_date: contactData.last_interaction_date,
          ...warmthTracking,
          relevance_score: relevance.score,
          relevance_bucket: relevance.bucket,
          overall_priority_score: priority.score,
          overall_priority_bucket: priority.bucket,
          total_interactions: contactData.interactions.length
        });

        for (const interaction of contactData.interactions) {
          interactionsToCreate.push({
            contact_data: contactData.full_name,
            interaction_type: interaction.type,
            date: interaction.date,
            xp_earned: 0,
            completed: true
          });
        }
      }

      if (duplicatesSkipped > 0) {
        toast.info(`Skipped ${duplicatesSkipped} duplicate contacts`);
      }

      // Step 4: Bulk create
      setProgressMessage('💾 Saving contacts to database...');
      setProgress(85);

      if (contactsToCreate.length > 0) {
        await base44.entities.Contact.bulkCreate(contactsToCreate);
      }

      setProgress(100);
      
      setResults({
        contacts: contactsToCreate.length,
        interactions: interactionsToCreate.length,
        highRelevance: contactsToCreate.filter(c => c.relevance_bucket === 'high').length,
        warmContacts: contactsToCreate.filter(c => c.warmth_bucket !== 'cold').length
      });

      toast.success(`✅ Imported ${contactsToCreate.length} contacts successfully!`);
      onSuccess?.();
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed. Please check your CSV files and try again.');
    } finally {
      setImporting(false);
    }
  };

  const removeFile = (fileName) => {
    setFileStatuses(prev => prev.map(f => 
      f.fileName === fileName 
        ? { ...f, status: 'missing', file: null, error: null }
        : f
    ));
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'uploaded':
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      case 'failed':
      case 'invalid':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'missing':
      default:
        return <div className="w-5 h-5 border-2 border-slate-300 rounded-full" />;
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Import LinkedIn Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
              <span className="font-semibold text-blue-900">📋 How to Export from LinkedIn</span>
              <ChevronDown className="w-4 h-4 text-blue-700" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Go to Settings & Privacy → Data Privacy → Get a copy of your data</li>
                <li>Select: <strong>Connections</strong> (required), plus Messages, Invitations, Endorsements, and Recommendations</li>
                <li>Request archive → Download when ready (may take 24-48 hours)</li>
                <li>Upload the CSV files here (can select multiple at once)</li>
              </ol>
              <p className="text-xs text-blue-700 mt-2">💡 <strong>Tip:</strong> The more files you upload, the more accurate your warmth scores will be!</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {!importing && !results && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-slate-900">LinkedIn Data Files Checklist:</p>
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="linkedin-file-input"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('linkedin-file-input').click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Select Files
                  </Button>
                </div>
              </div>
              
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100">
                    <span className="font-medium text-slate-900">File Checklist ({fileStatuses.filter(f => f.status === 'uploaded' || f.status === 'success').length}/{fileStatuses.length})</span>
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {fileStatuses.map((fileStatus, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        fileStatus.status === 'success' ? 'bg-emerald-50 border-emerald-200' :
                        fileStatus.status === 'uploaded' ? 'bg-blue-50 border-blue-200' :
                        fileStatus.status === 'failed' || fileStatus.status === 'invalid' ? 'bg-red-50 border-red-200' :
                        'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(fileStatus.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{fileStatus.fileName}</p>
                            {fileStatus.required && (
                              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                                Required
                              </Badge>
                            )}
                          </div>
                          {fileStatus.status === 'uploaded' && (
                            <p className="text-xs text-blue-700 mt-0.5">Ready to import</p>
                          )}
                          {fileStatus.status === 'success' && (
                            <p className="text-xs text-emerald-700 mt-0.5">Successfully imported</p>
                          )}
                          {fileStatus.status === 'missing' && !fileStatus.required && (
                            <p className="text-xs text-slate-500 mt-0.5">Optional - improves accuracy</p>
                          )}
                          {(fileStatus.status === 'failed' || fileStatus.status === 'invalid') && fileStatus.error && (
                            <p className="text-xs text-red-700 mt-0.5">{fileStatus.error}</p>
                          )}
                        </div>
                      </div>
                      
                      {fileStatus.status === 'uploaded' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileStatus.fileName)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>

            <Button 
              onClick={handleImport} 
              className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
              disabled={!fileStatuses.some(f => f.type === CSV_TYPES.CONNECTIONS && f.status === 'uploaded')}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import LinkedIn Data
            </Button>
          </>
        )}

        {importing && (
          <div className="space-y-4 py-8">
            <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
            <div className="space-y-2">
              <p className="text-center text-sm text-slate-700 font-medium">{progressMessage}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Progress</span>
                <span className="font-semibold text-slate-900">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            
            {/* Show file statuses during import */}
            <div className="mt-6 space-y-2">
              {fileStatuses.filter(f => f.status !== 'missing').map((fileStatus, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {getStatusIcon(fileStatus.status)}
                  <span className="text-slate-700">{fileStatus.fileName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900">Import Complete!</h3>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{results.contacts}</p>
                <p className="text-sm text-blue-900 mt-1">Contacts Imported</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{results.highRelevance}</p>
                <p className="text-sm text-emerald-900 mt-1">High Relevance</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{results.warmContacts}</p>
                <p className="text-sm text-amber-900 mt-1">Warm/Hot</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{results.interactions}</p>
                <p className="text-sm text-purple-900 mt-1">Interactions</p>
              </div>
            </div>

            <Button
              onClick={() => {
                setFileStatuses(FILE_CHECKLIST.map(item => ({ ...item, status: 'missing', file: null, error: null })));
                setResults(null);
                setProgress(0);
                setProgressMessage('');
              }}
              variant="outline"
              className="w-full mt-4"
            >
              Import More Files
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}