import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  CheckCircle2,
  Circle,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Target,
  TrendingUp
} from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from "@/components/i18n/TranslationContext";

export default function WeeklyPlan() {
  const { t } = useTranslation('weeklyPlan');
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

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

  const { data: careerProfile } = useQuery({
    queryKey: ['careerProfile'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserCareerProfile.filter({ created_by: user.email });
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

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  
  const currentWeek = weeklyPlans.find(p => p.week_start_date === weekStartStr) || weeklyPlans[0];
  const hasPlanForThisWeek = weeklyPlans.some(p => p.week_start_date === weekStartStr);

  const completeMutation = useMutation({
    mutationFn: async ({ planId, contactId }) => {
      const plan = weeklyPlans.find(p => p.id === planId);
      const updatedContacts = plan.planned_contacts.map(pc => 
        pc.contact_id === contactId ? { ...pc, completed: true } : pc
      );
      const completedCount = updatedContacts.filter(pc => pc.completed).length;

      await base44.entities.WeeklyPlan.update(planId, {
        planned_contacts: updatedContacts,
        completed_contacts: completedCount
      });

      // Log interaction
      await base44.entities.Interaction.create({
        contact_id: contactId,
        interaction_type: 'direct_message',
        date: format(new Date(), 'yyyy-MM-dd'),
        xp_earned: 10,
        completed: true
      });

      // Update contact
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        await base44.entities.Contact.update(contactId, {
          last_interaction_date: format(new Date(), 'yyyy-MM-dd'),
          total_interactions: (contact.total_interactions || 0) + 1,
          warmth_score: contact.warmth_score === 'cold' ? 'warm' : contact.warmth_score
        });
      }

      // Update user XP
      if (settings) {
        await base44.entities.UserSettings.update(settings.id, {
          total_xp: (settings.total_xp || 0) + 10
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['weeklyPlans']);
      queryClient.invalidateQueries(['contacts']);
      queryClient.invalidateQueries(['settings']);
      toast.success('Great job! +10 XP earned 🎉');
    },
  });

  const generateWeeklyPlan = async () => {
    setGenerating(true);
    try {
      // Use profile capacity first, fallback to settings, default to 5
      const weeklyGoal = careerProfile?.weekly_networking_capacity || settings?.weekly_outreach_goal || 5;

      // 0. If a plan already exists for this week, delete it (Regenerate)
      const existingCurrentPlan = weeklyPlans.find(p => p.week_start_date === format(weekStart, 'yyyy-MM-dd'));
      if (existingCurrentPlan) {
        await base44.entities.WeeklyPlan.delete(existingCurrentPlan.id);
      }

      // 1. Identify active plans from previous weeks and collect incomplete contacts
      const activeOldPlans = weeklyPlans.filter(p => 
        p.status === 'active' && p.week_start_date !== format(weekStart, 'yyyy-MM-dd')
      );

      const rolloverContactIds = new Set();
      
      for (const plan of activeOldPlans) {
        // Collect incomplete
        plan.planned_contacts.forEach(pc => {
          if (!pc.completed) {
            rolloverContactIds.add(pc.contact_id);
          }
        });

        // Close the old plan
        await base44.entities.WeeklyPlan.update(plan.id, { status: 'missed' }); // Mark as missed/closed
      }
      
      // Priority scoring algorithm
      const scoredContacts = contacts.map(contact => {
        let score = 0;
        
        // Rollover Boost (Highest Priority)
        if (rolloverContactIds.has(contact.id)) {
          score += 1000; // Ensure they are picked first
        }

        // Relevance scoring
        if (contact.relevance_bucket === 'high') score += 100;
        else if (contact.relevance_bucket === 'medium') score += 50;
        
        // Warmth scoring (prioritize cold high-relevance contacts)
        if (contact.warmth_bucket === 'cold' && contact.relevance_bucket === 'high') score += 50;
        else if (contact.warmth_bucket === 'warm') score += 30;
        else if (contact.warmth_bucket === 'hot') score += 10;
        
        // Recency penalty (deprioritize recently contacted)
        if (contact.last_interaction_date) {
          const daysSince = Math.floor(
            (new Date() - new Date(contact.last_interaction_date)) / (1000 * 60 * 60 * 24)
          );
          if (daysSince < 30) score -= 50;
          else if (daysSince < 60) score -= 20;
        } else {
          score += 20; // Bonus for never contacted
        }
        
        return { ...contact, priority_score: score };
      });

      // Sort by priority and take top N
      const topContacts = scoredContacts
        .sort((a, b) => b.priority_score - a.priority_score)
        .slice(0, weeklyGoal);

      const plannedContacts = topContacts.map(contact => ({
        contact_id: contact.id,
        suggested_action: rolloverContactIds.has(contact.id) 
          ? 'Rollover: Follow up from last week'
          : (contact.warmth_bucket === 'cold' ? 'Send reconnection message' : 'Check in and share value'),
        completed: false
      }));

      await base44.entities.WeeklyPlan.create({
        week_start_date: format(weekStart, 'yyyy-MM-dd'),
        target_contacts: weeklyGoal,
        completed_contacts: 0,
        xp_earned: 0,
        status: 'active',
        planned_contacts: plannedContacts
      });

      queryClient.invalidateQueries(['weeklyPlans']);
      toast.success('Your weekly plan is ready! 🎯');
    } catch (error) {
      toast.error('Error generating plan');
      console.error(error);
    }
    setGenerating(false);
  };

  const progress = currentWeek 
    ? (currentWeek.completed_contacts / currentWeek.target_contacts) * 100 
    : 0;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
            <Calendar className="w-9 h-9" />
            {t('title')}
          </h1>
          <p className="text-slate-600 mt-1">
            {t('weekOf', { date: format(weekStart, 'MMMM d, yyyy') })}
          </p>
        </div>
        
        <Button 
          onClick={generateWeeklyPlan}
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              {t('common:generating')}
            </>
          ) : hasPlanForThisWeek ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('regenerate')}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {t('generateNew')}
            </>
          )}
        </Button>
      </div>

      {/* Progress Overview */}
      {currentWeek ? (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-2">{t('progressThisWeek')}</p>
                <p className="text-5xl font-bold mb-4">
                  {Math.round(progress)}%
                </p>
                <Progress value={progress} className="h-3 bg-blue-700" />
              </div>
              <div>
                <p className="text-blue-100 text-sm font-medium mb-2">{t('contactsReached')}</p>
                <p className="text-5xl font-bold">
                  {currentWeek.completed_contacts}<span className="text-2xl text-blue-200">/{currentWeek.target_contacts}</span>
                </p>
              </div>
              <div>
                <p className="text-blue-100 text-sm font-medium mb-2">{t('xpThisWeek')}</p>
                <p className="text-5xl font-bold flex items-center gap-2">
                  {currentWeek.xp_earned || (currentWeek.completed_contacts * 10)}
                  <TrendingUp className="w-8 h-8 text-blue-200" />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-blue-50">
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('noActivePlan')}</h3>
            <p className="text-slate-600 mb-6">
              {t('getStarted')}
            </p>
            <Button onClick={generateWeeklyPlan} disabled={generating} size="lg">
              {generating ? t('common:generating') : t('generateNew')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Planned Contacts */}
      {currentWeek && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{t('thisWeeksContacts')}</h2>
          
          {currentWeek.planned_contacts?.map((planned, idx) => {
            const contact = contacts.find(c => c.id === planned.contact_id);
            if (!contact) return null;

            return (
              <Card 
                key={idx}
                className={cn(
                  "border-2 transition-all duration-300",
                  planned.completed 
                    ? "bg-emerald-50 border-emerald-200 opacity-75" 
                    : "bg-white border-slate-200 hover:shadow-lg"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 pt-1">
                      {planned.completed ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                      ) : (
                        <Circle className="w-7 h-7 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {contact.first_name} {contact.last_name}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {contact.current_title} at {contact.current_company}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className={
                            contact.warmth_bucket === 'hot' ? 'border-red-300 text-red-700' :
                            contact.warmth_bucket === 'warm' ? 'border-amber-300 text-amber-700' :
                            'border-blue-300 text-blue-700'
                          }>
                            {contact.warmth_bucket === 'hot' ? '🔥' : contact.warmth_bucket === 'warm' ? '☀️' : '❄️'} {t('contacts:warmth')}: {contact.warmth_score}
                          </Badge>
                          <Badge variant="outline" className={
                            contact.relevance_bucket === 'high' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            contact.relevance_bucket === 'medium' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }>
                            {t('contacts:relevance')}: {contact.relevance_score} ({contact.relevance_bucket})
                          </Badge>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium text-slate-700 mb-1">{t('suggestedAction')}</p>
                        <p className="text-slate-900">{planned.suggested_action}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        {!planned.completed && (
                          <Button
                            onClick={() => completeMutation.mutate({ 
                              planId: currentWeek.id, 
                              contactId: contact.id 
                            })}
                            disabled={completeMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {t('markComplete')}
                          </Button>
                        )}
                        {contact.profile_url && (
                          <Button variant="outline" asChild>
                            <a href={contact.profile_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              {t('openLinkedin')}
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Past Plans Section */}
      {weeklyPlans.length > 1 && (
        <div className="space-y-4 pt-8 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">{t('pastWeeks')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weeklyPlans
              .filter(p => p.id !== currentWeek?.id)
              .map(plan => (
              <Card key={plan.id} className="bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {t('weekOf', { date: format(new Date(plan.week_start_date), 'MMM d') })}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">{plan.status}</p>
                    </div>
                    <Badge variant="secondary" className={
                      plan.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                      plan.status === 'missed' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200'
                    }>
                      {t('percentDone', { percent: Math.round((plan.completed_contacts / plan.target_contacts) * 100) })}
                    </Badge>
                  </div>
                  <Progress value={(plan.completed_contacts / plan.target_contacts) * 100} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}