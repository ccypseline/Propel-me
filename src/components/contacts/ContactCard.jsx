import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  MapPin, 
  Flame, 
  MessageSquare, 
  ExternalLink,
  Star,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { enrichContactFromLinkedIn } from '../utils/linkedinEnrichment';
import { toast } from 'sonner';
import { useTranslation } from "@/components/i18n/TranslationContext";

export default function ContactCard({ contact, onClick, onEnriched }) {
  const { t } = useTranslation('contacts');
  const [enriching, setEnriching] = useState(false);

  const warmthConfig = {
    hot: { color: 'bg-red-100 text-red-700 border-red-200', icon: '🔥' },
    warm: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '☀️' },
    cold: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '❄️' }
  };

  const relevanceConfig = {
    high: { 
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
      icon: (
        <div className="flex gap-0.5" title="High Relevance">
          <Star className="w-3 h-3 fill-current" />
          <Star className="w-3 h-3 fill-current" />
          <Star className="w-3 h-3 fill-current" />
        </div>
      )
    },
    medium: { 
      color: 'bg-sky-100 text-sky-700 border-sky-200', 
      icon: (
        <div className="flex gap-0.5" title="Medium Relevance">
          <Star className="w-3 h-3 fill-current" />
          <Star className="w-3 h-3 fill-current" />
        </div>
      )
    },
    low: { 
      color: 'bg-slate-100 text-slate-500 border-slate-200', 
      icon: (
        <div className="flex gap-0.5" title="Low Relevance">
          <Star className="w-3 h-3" />
        </div>
      )
    }
  };

  const warmth = warmthConfig[contact.warmth_bucket] || warmthConfig.cold;
  const relevance = relevanceConfig[contact.relevance_bucket] || relevanceConfig.medium;

  const handleEnrich = async (e) => {
    e.stopPropagation();
    
    if (!contact.profile_url) {
      toast.error("This contact doesn't have a LinkedIn URL yet. Please add one to enable enrichment.");
      return;
    }

    setEnriching(true);
    toast.info('Enriching contact from LinkedIn...');

    try {
      const careerProfiles = await base44.entities.UserCareerProfile.list();
      const careerProfile = careerProfiles[0];

      const result = await enrichContactFromLinkedIn(contact, careerProfile);
      
      if (result.success) {
        toast.success('Contact enriched successfully!');
        onEnriched?.();
      } else {
        toast.error(result.error || 'Failed to enrich contact');
      }
    } catch (error) {
      toast.error('Error enriching contact');
    } finally {
      setEnriching(false);
    }
  };

  const needsEnrichment = contact.profile_url && (!contact.industry || !contact.location);

  return (
    <Card 
      className="p-5 hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {contact.first_name?.[0]}{contact.last_name?.[0]}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {contact.first_name} {contact.last_name}
            </h3>
            <p className="text-sm text-slate-600">{contact.current_title}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Badge className={cn("border px-2 gap-1", warmth.color)} title={`Warmth: ${contact.warmth_bucket} (${contact.warmth_score})`}>
            {warmth.icon}
            <span>{t(`dashboard:${contact.warmth_bucket}`)}</span>
          </Badge>
          <Badge className={cn("border flex items-center gap-1 px-2", relevance.color)} title={`Relevance: ${contact.relevance_bucket} (${contact.relevance_score})`}>
            {relevance.icon}
            <span>{t(`dashboard:${contact.relevance_bucket}`)}</span>
          </Badge>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-600 mb-4">
        {contact.current_company && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            {contact.current_company}
          </div>
        )}
        {contact.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            {contact.location}
          </div>
        )}
        {contact.last_interaction_date && (
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            {t('lastContact', { date: format(new Date(contact.last_interaction_date), 'MMM d, yyyy') })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="flex-1 text-slate-500">
          {t('interactions', { count: contact.total_interactions || 0 })}
        </span>
        <div className="flex items-center gap-2">
          {needsEnrichment && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEnrich}
              disabled={enriching}
              className="h-7 px-2 text-xs hover:bg-blue-50 hover:text-blue-700"
            >
              {enriching ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t('enrich')}
                </>
              )}
            </Button>
          )}
          {contact.profile_url && (
            <a 
              href={contact.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {t('linkedin')} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}