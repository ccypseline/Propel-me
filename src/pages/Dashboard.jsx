import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Flame, 
  Zap, 
  TrendingUp,
  Calendar,
  Award
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useTranslation } from "@/components/i18n/TranslationContext";

import StatsCard from '../components/dashboard/StatsCard';
import RAGIndicator from '../components/dashboard/RAGIndicator';
import WeeklyProgress from '../components/dashboard/WeeklyProgress';
import NetworkIntelWidget from '../components/intelligence/NetworkIntelWidget';
import GoogleAdBanner from '../components/common/GoogleAdBanner';

export default function Dashboard() {
  const { t } = useTranslation('dashboard');
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Contact.filter({ created_by: user.email });
    },
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserSettings.filter({ created_by: user.email });
      return list[0];
    },
  });

  const { data: weeklyPlans = [] } = useQuery({
    queryKey: ['weeklyPlans'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.WeeklyPlan.filter({ created_by: user.email }, '-week_start_date');
    },
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['interactions'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Interaction.filter({ created_by: user.email }, '-date');
    },
  });

  // Calculate stats
  const hotContacts = contacts.filter(c => c.warmth_bucket === 'hot').length;
  const warmContacts = contacts.filter(c => c.warmth_bucket === 'warm').length;
  const coldContacts = contacts.filter(c => c.warmth_bucket === 'cold').length;

  const highRelevance = contacts.filter(c => c.relevance_bucket === 'high');
  const mediumRelevance = contacts.filter(c => c.relevance_bucket === 'medium');
  const lowRelevance = contacts.filter(c => c.relevance_bucket === 'low' || !c.relevance_bucket);

  // RAG for high relevance contacts
  const highWarm = highRelevance.filter(c => c.warmth_bucket !== 'cold').length;
  const highRAG = highRelevance.length === 0 ? 'amber' :
                  highWarm / highRelevance.length >= 0.7 ? 'green' : 
                  highWarm / highRelevance.length >= 0.4 ? 'amber' : 'red';

  // Overall network health RAG
  const warmRatio = contacts.length === 0 ? 0 : (hotContacts + warmContacts) / contacts.length;
  const overallRAG = warmRatio >= 0.6 ? 'green' : warmRatio >= 0.3 ? 'amber' : 'red';

  // Weekly completion RAG
  const currentWeek = weeklyPlans[0];
  const weeklyProgress = currentWeek ? currentWeek.completed_contacts / currentWeek.target_contacts : 0;
  const weeklyRAG = weeklyProgress >= 0.8 ? 'green' : weeklyProgress >= 0.5 ? 'amber' : 'red';

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-slate-900">
          {t('welcome')}
        </h1>
        <p className="text-lg text-slate-600">
          {t('overview', { date: format(new Date(), 'EEEE, MMMM d') })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon={Users}
          label={t('totalContacts')}
          value={contacts.length}
          color="blue"
        />
        <StatsCard
          icon={Flame}
          label={t('hotContacts')}
          value={hotContacts}
          color="red"
        />
        <StatsCard
          icon={TrendingUp}
          label={t('currentStreak')}
          value={`${settings?.current_streak || 0} days`}
          color="emerald"
          trend={settings?.current_streak > 0 ? '🔥' : ''}
        />
        <StatsCard
          icon={Award}
          label={t('totalXp')}
          value={settings?.total_xp || 0}
          color="purple"
          trend={t('level', { level: settings?.level || 1 })}
        />
      </div>

      {/* RAG Indicators */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('networkHealth')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RAGIndicator
            status={overallRAG}
            label={t('overallNetwork')}
            count={`${Math.round(warmRatio * 100)}%`}
            subtitle={t('warmOrHot', { count: hotContacts + warmContacts })}
            description={overallRAG === 'green' ? t('networkThriving') :
                         overallRAG === 'amber' ? t('networkGood') :
                         t('networkCold')}
          />
          <RAGIndicator
            status={highRAG}
            label={t('highRelevance')}
            count={highRelevance.length}
            subtitle={t('engagedActively', { count: highWarm })}
            description={highRAG === 'green' ? t('relevanceGreen') :
                         highRAG === 'amber' ? t('relevanceAmber') :
                         t('relevanceRed')}
          />
          <RAGIndicator
            status={weeklyRAG}
            label={t('weeklyProgress')}
            count={currentWeek ? `${currentWeek.completed_contacts}/${currentWeek.target_contacts}` : 'N/A'}
            subtitle={currentWeek ? t('percentComplete', { percent: Math.round(weeklyProgress * 100) }) : t('noActivePlan')}
            description={!currentWeek ? t('generatePlan') :
                         weeklyRAG === 'green' ? t('weeklyGreen') :
                         weeklyRAG === 'amber' ? t('weeklyAmber') :
                         t('weeklyRed')}
          />
        </div>
      </div>

      {/* Weekly Plan + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WeeklyProgress 
            weeklyPlan={currentWeek} 
            contacts={contacts}
          />
          
          {/* Market Intelligence Widget */}
          <div className="h-[400px]">
             <NetworkIntelWidget contacts={contacts} />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6" />
              <h3 className="font-bold text-lg">{t('weeklyGoal')}</h3>
            </div>
            <p className="text-4xl font-bold mb-2">
              {currentWeek?.target_contacts || settings?.weekly_outreach_goal || 0}
            </p>
            <p className="text-blue-100 text-sm">{t('contactsThisWeek')}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-slate-200 shadow-lg">
            <h3 className="font-bold text-slate-900 mb-4">{t('warmthBreakdown')}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-sm text-slate-600">{t('hot')}</span>
                </div>
                <span className="font-bold text-slate-900">{hotContacts}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full" />
                  <span className="text-sm text-slate-600">{t('warm')}</span>
                </div>
                <span className="font-bold text-slate-900">{warmContacts}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm text-slate-600">{t('cold')}</span>
                </div>
                <span className="font-bold text-slate-900">{coldContacts}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-slate-200 shadow-lg">
            <h3 className="font-bold text-slate-900 mb-4">{t('relevanceBreakdown')}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <span className="text-sm text-slate-600">{t('high')}</span>
                </div>
                <span className="font-bold text-slate-900">{highRelevance.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-sky-500 rounded-full" />
                  <span className="text-sm text-slate-600">{t('medium')}</span>
                </div>
                <span className="font-bold text-slate-900">{mediumRelevance.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-400 rounded-full" />
                  <span className="text-sm text-slate-600">{t('low')}</span>
                </div>
                <span className="font-bold text-slate-900">{lowRelevance.length}</span>
              </div>
            </div>
          </div>

          {/* Ad Banner */}
          <GoogleAdBanner />
        </div>
      </div>
    </div>
  );
}