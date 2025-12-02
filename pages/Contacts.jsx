import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Search, Sparkles, RefreshCw, Star } from 'lucide-react';
import ContactCard from '../components/contacts/ContactCard';
import LinkedInMultiImporter from '../components/contacts/LinkedInMultiImporter';
import AddContactDialog from '../components/contacts/AddContactDialog';
import EnrichmentDialog from '../components/contacts/EnrichmentDialog';
import { toast } from 'sonner';
import { calculateRelevanceScore, calculateWarmthScore } from '../components/utils/scoringUtils';
import { useTranslation } from "@/components/i18n/TranslationContext";

export default function Contacts() {
  const { t } = useTranslation('contacts');
  const [searchTerm, setSearchTerm] = useState('');
  const [warmthFilter, setWarmthFilter] = useState('all');
  const [relevanceFilter, setRelevanceFilter] = useState('all');
  const [updatingRelevance, setUpdatingRelevance] = useState(false);

  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Contact.filter({ created_by: user.email });
    },
  });

  const handleCSVSuccess = () => {
    refetch();
  };

  const handleLinkedInSync = async () => {
    toast.info('Connecting to LinkedIn...');
    try {
      // In a real app, we'd handle OAuth here to get the token. 
      // For this demo, we'll assume the backend has what it needs or we send a placeholder.
      const response = await fetch('/api/functions/linkedin/syncContacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: 'placeholder_token' }) 
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      toast.success(`LinkedIn Sync: ${data.message}`);
      if (data.profile) {
         toast.info(`Connected as ${data.profile.localizedFirstName} ${data.profile.localizedLastName}`);
      }
    } catch (error) {
      toast.error('LinkedIn Sync failed. Check API configuration.');
      console.error(error);
    }
  };

  const handleUpdateRelevance = async () => {
    setUpdatingRelevance(true);
    toast.info('Analyzing contact relevance (Client-side)...');

    try {
       const user = await base44.auth.me();
       const [careerProfiles, userSettings] = await Promise.all([
         base44.entities.UserCareerProfile.filter({ created_by: user.email }),
         base44.entities.UserSettings.filter({ created_by: user.email })
       ]);
       
       const profile = careerProfiles[0];
       const weights = userSettings[0]?.relevance_weights;

       if (!profile) {
         throw new Error("No career profile found. Please update your profile settings.");
       }

       let updatedCount = 0;
       
       // Process updates in batches
       const BATCH_SIZE = 20;
       for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
         const batch = contacts.slice(i, i + BATCH_SIZE);
         await Promise.all(batch.map(async (contact) => {
           const lastDate = contact.last_interaction_date || contact.connected_on;
           const warmth = calculateWarmthScore(lastDate);
           const rel = calculateRelevanceScore(contact, profile, weights);
           
           if (contact.relevance_score !== rel.score || 
               contact.relevance_bucket !== rel.bucket ||
               contact.warmth_score !== warmth.score ||
               contact.warmth_bucket !== warmth.bucket) {
              try {
                await base44.entities.Contact.update(contact.id, {
                  relevance_score: rel.score,
                  relevance_bucket: rel.bucket,
                  warmth_score: warmth.score,
                  warmth_bucket: warmth.bucket
                });
                updatedCount++;
              } catch (e) {
                console.error(`Failed to update contact ${contact.id}:`, e);
              }
           }
         }));
       }

      toast.success(`Sweep complete! Updated scores for ${updatedCount} contacts.`);
      refetch();
    } catch (error) {
      console.error('Prioritization error:', error);
      toast.error(`Error updating scores: ${error.message}`);
    } finally {
      setUpdatingRelevance(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.current_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.current_title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesWarmth = warmthFilter === 'all' || contact.warmth_bucket === warmthFilter;
    const matchesRelevance = relevanceFilter === 'all' || contact.relevance_bucket === relevanceFilter;

    return matchesSearch && matchesWarmth && matchesRelevance;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-9 h-9" />
            {t('title')}
          </h1>
          <p className="text-slate-600 mt-1">
            {t('subtitle', { count: contacts.length })}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleLinkedInSync}
            variant="outline"
            className="bg-[#0077b5] hover:bg-[#006097] text-white border-[#0077b5] hover:border-[#006097]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('syncLinkedin')}
          </Button>
          <EnrichmentDialog 
            contacts={contacts} 
            onSuccess={async () => {
              await refetch();
              handleUpdateRelevance();
            }} 
          />
          <Button
            onClick={handleUpdateRelevance}
            disabled={updatingRelevance}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            {updatingRelevance ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                {t('analyzing')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {t('updateRelevance')}
              </>
            )}
          </Button>
          <AddContactDialog onSuccess={handleCSVSuccess} />
        </div>
      </div>

      {/* Empty State */}
      {contacts.length === 0 && !isLoading && (
        <LinkedInMultiImporter onSuccess={handleCSVSuccess} />
      )}

      {/* Import More Section */}
      {contacts.length > 0 && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t('importMore')}</h3>
                <p className="text-sm text-slate-600 mt-1">{t('importDesc')}</p>
              </div>
              <LinkedInMultiImporter onSuccess={handleCSVSuccess} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      {contacts.length > 0 && (
        <>
          {/* Legend / Index */}
          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-slate-200 mb-6">
            <div className="flex flex-col md:flex-row gap-8 text-sm">
              <div className="space-y-2">
                <span className="font-semibold text-slate-900 text-sm">{t('warmthScale')}</span>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1.5 bg-red-100 text-red-700 px-2.5 py-1 rounded-md border border-red-200 font-medium">
                    {t('dashboard:hot')}
                  </span>
                  <span className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
                    {t('dashboard:warm')}
                  </span>
                  <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-medium">
                    {t('dashboard:cold')}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="font-semibold text-slate-900 text-sm">{t('relevanceScale')}</span>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200 font-medium">
                    <div className="flex"><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /></div> {t('dashboard:high')}
                  </span>
                  <span className="flex items-center gap-1.5 bg-sky-100 text-sky-700 px-2.5 py-1 rounded-md border border-sky-200 font-medium">
                    <div className="flex"><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /></div> {t('dashboard:medium')}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
                    <div className="flex"><Star className="w-3 h-3" /></div> {t('dashboard:low')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={warmthFilter} onValueChange={setWarmthFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder={t('dashboard:warmthBreakdown')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allWarmth')}</SelectItem>
                <SelectItem value="hot">{t('dashboard:hot')}</SelectItem>
                <SelectItem value="warm">{t('dashboard:warm')}</SelectItem>
                <SelectItem value="cold">{t('dashboard:cold')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={relevanceFilter} onValueChange={setRelevanceFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder={t('dashboard:relevanceBreakdown')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allRelevance')}</SelectItem>
                <SelectItem value="high">{t('dashboard:high')}</SelectItem>
                <SelectItem value="medium">{t('dashboard:medium')}</SelectItem>
                <SelectItem value="low">{t('dashboard:low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {t('showing', { filtered: filteredContacts.length, total: contacts.length })}
            </p>
          </div>

          {/* Contact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map(contact => (
              <ContactCard 
                key={contact.id} 
                contact={contact} 
                onEnriched={refetch}
              />
            ))}
          </div>

          {filteredContacts.length === 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600">{t('noMatches')}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}