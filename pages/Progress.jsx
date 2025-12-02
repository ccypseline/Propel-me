import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { 
  Trophy,
  Award,
  Flame,
  TrendingUp,
  Target,
  Zap,
  Star,
  Users,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { countReactivations } from '../components/utils/warmthTracking';

const BADGES = [
  { id: 'warm_up_wizard', name: 'Warm-Up Wizard', description: '10+ cold contacts reactivated', icon: Flame, requirement: 10, color: 'from-orange-500 to-red-600' },
  { id: 'consistency_king', name: 'Consistency Champion', description: '4-week streak maintained', icon: Target, requirement: 28, color: 'from-blue-500 to-blue-700' },
  { id: 'connector', name: 'Super Connector', description: '20 successful interactions', icon: Users, requirement: 20, color: 'from-purple-500 to-purple-700' },
  { id: 'industry_hunter', name: 'Industry Hunter', description: 'Engaged all high-relevance contacts', icon: Star, requirement: 1, color: 'from-emerald-500 to-emerald-700' },
  { id: 'message_master', name: 'Message Master', description: '50 messages sent', icon: MessageSquare, requirement: 50, color: 'from-pink-500 to-pink-700' },
  { id: 'network_builder', name: 'Network Builder', description: '500 total contacts', icon: TrendingUp, requirement: 500, color: 'from-indigo-500 to-indigo-700' },
];

export default function ProgressPage() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const list = await base44.entities.UserSettings.list();
      return list[0];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['interactions'],
    queryFn: () => base44.entities.Interaction.list(),
  });

  const { data: weeklyPlans = [] } = useQuery({
    queryKey: ['weeklyPlans'],
    queryFn: () => base44.entities.WeeklyPlan.list('-week_start_date'),
  });

  // Calculate statistics
  const totalXP = settings?.total_xp || 0;
  const currentLevel = settings?.level || 1;
  const currentStreak = settings?.current_streak || 0;
  const longestStreak = settings?.longest_streak || 0;
  const earnedBadges = settings?.badges_earned || [];

  const xpForNextLevel = currentLevel * 100;
  const xpProgress = (totalXP % 100) / xpForNextLevel * 100;

  // Badge progress - use new reactivation tracking
  const reactivatedCount = countReactivations(contacts, settings?.badge_start_date);
  
  const totalInteractions = interactions.length;
  const highRelevanceEngaged = contacts.filter(c => 
    c.relevance_bucket === 'high' && c.total_interactions > 0
  ).length;
  const highRelevanceTotal = contacts.filter(c => c.relevance_bucket === 'high').length;

  const badgeProgress = {
    warm_up_wizard: reactivatedCount,
    consistency_king: currentStreak,
    connector: totalInteractions,
    industry_hunter: highRelevanceTotal > 0 && highRelevanceEngaged === highRelevanceTotal ? 1 : 0,
    message_master: totalInteractions,
    network_builder: contacts.length,
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
          <Trophy className="w-9 h-9 text-amber-500" />
          Your Progress
        </h1>
        <p className="text-slate-600 mt-1">
          Track your networking journey and achievements
        </p>
      </div>

      {/* XP Info Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Zap className="w-6 h-6 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 mb-2">💡 How to Earn XP</h3>
              <div className="space-y-2 text-sm text-slate-700">
                <p>• <strong>Generate Weekly Plan</strong> - Get AI-powered contact suggestions</p>
                <p>• <strong>Complete Interactions</strong> - Mark contacts as reached (+10 XP each)</p>
                <p>• <strong>Build Streaks</strong> - Stay consistent to unlock badges</p>
                <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-300">
                  Go to "Weekly Plan" → Generate a plan → Reach out to contacts → Mark as complete to earn XP!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8" />
              <span className="text-3xl font-bold">{currentLevel}</span>
            </div>
            <p className="text-amber-100 text-sm font-medium">Current Level</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8" />
              <span className="text-3xl font-bold">{totalXP}</span>
            </div>
            <p className="text-blue-100 text-sm font-medium">Total XP</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Flame className="w-8 h-8" />
              <span className="text-3xl font-bold">{currentStreak}</span>
            </div>
            <p className="text-orange-100 text-sm font-medium">Day Streak</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8" />
              <span className="text-3xl font-bold">{earnedBadges.length}</span>
            </div>
            <p className="text-emerald-100 text-sm font-medium">Badges Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Level Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Level {currentLevel}</p>
              <p className="text-2xl font-bold text-slate-900">
                {totalXP % 100} / {xpForNextLevel} XP
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Next Level</p>
              <p className="text-2xl font-bold text-blue-600">{currentLevel + 1}</p>
            </div>
          </div>
          <ProgressBar value={xpProgress} className="h-4" />
          <p className="text-sm text-slate-600 text-center">
            {xpForNextLevel - (totalXP % 100)} XP needed to level up
          </p>
        </CardContent>
      </Card>

      {/* Badges */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Badges & Achievements</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BADGES.map((badge) => {
            const progress = badgeProgress[badge.id] || 0;
            const earned = earnedBadges.includes(badge.id) || progress >= badge.requirement;
            const progressPercent = Math.min((progress / badge.requirement) * 100, 100);
            const Icon = badge.icon;

            // Special display for Industry Hunter
            let displayRequirement = badge.requirement;
            let displayProgress = progress;
            if (badge.id === 'industry_hunter') {
              displayRequirement = highRelevanceTotal;
              displayProgress = highRelevanceEngaged;
            }

            return (
              <Card 
                key={badge.id}
                className={`border-2 transition-all duration-300 ${
                  earned 
                    ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-xl' 
                    : 'border-slate-200 bg-white hover:shadow-lg'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${badge.color} flex items-center justify-center shadow-lg ${!earned && 'opacity-40 grayscale'}`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 mb-1">{badge.name}</h3>
                      <p className="text-sm text-slate-600">{badge.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-semibold text-slate-900">
                        {displayProgress} / {displayRequirement}
                      </span>
                    </div>
                    <ProgressBar value={progressPercent} className="h-2" />
                    {earned && (
                      <Badge className="bg-amber-500 text-white border-0 w-full justify-center">
                        ✓ Unlocked
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {interactions.slice(0, 5).map((interaction, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{interaction.interaction_type}</p>
                    <p className="text-sm text-slate-600">
                      {format(new Date(interaction.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  +{interaction.xp_earned} XP
                </Badge>
              </div>
            ))}
            {interactions.length === 0 && (
              <p className="text-center text-slate-500 py-8">
                No activity yet. Start networking to see your progress!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}