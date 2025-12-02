import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from "@/components/i18n/TranslationContext";

export default function WeeklyProgress({ weeklyPlan, contacts }) {
  const { t } = useTranslation('weeklyPlan');
  if (!weeklyPlan) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Target className="w-5 h-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">{t('noActivePlan')}</p>
        </CardContent>
      </Card>
    );
  }

  const progress = (weeklyPlan.completed_contacts / weeklyPlan.target_contacts) * 100;
  const plannedContactsList = weeklyPlan.planned_contacts || [];

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Target className="w-5 h-5" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-600">
              {weeklyPlan.completed_contacts} / {weeklyPlan.target_contacts}
            </span>
            <span className="text-sm font-bold text-blue-600">
              {t('percentDone', { percent: Math.round(progress) })}
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">{t('thisWeeksContacts')}</h4>
          {plannedContactsList.slice(0, 5).map((planned, idx) => {
            const contact = contacts?.find(c => c.id === planned.contact_id);
            if (!contact) return null;

            return (
              <div 
                key={idx}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all",
                  planned.completed ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200"
                )}
              >
                {planned.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm",
                    planned.completed ? "text-emerald-900" : "text-slate-900"
                  )}>
                    {contact.first_name} {contact.last_name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {t(planned.suggested_action === 'Check in and share value' ? 'checkIn' :
                       planned.suggested_action === 'Send reconnection message' ? 'reconnect' :
                       planned.suggested_action === 'Rollover: Follow up from last week' ? 'rollover' :
                       'common:reachOut') || planned.suggested_action}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}