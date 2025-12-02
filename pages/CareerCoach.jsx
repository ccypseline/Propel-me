
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sparkles,
  TrendingUp,
  Target,
  BookOpen,
  Briefcase,
  Users,
  CheckCircle,
  Clock,
  Loader2,
  ChevronRight,
  AlertCircle,
  Award,
  Lightbulb,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import CareerCoachChat from '../components/career/CareerCoachChat';

export default function CareerCoach() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [selectedSessionType, setSelectedSessionType] = useState('comprehensive');
  const [activeSession, setActiveSession] = useState(null);
  const [activeView, setActiveView] = useState('chat'); // 'chat' or 'session'
  const [currentConversationId, setCurrentConversationId] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => base44.entities.Resume.list('-created_date'),
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ['interviewSessions'],
    queryFn: () => base44.entities.InterviewSession.list('-created_date'),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: coachingSessions = [] } = useQuery({
    queryKey: ['coachingSessions'],
    queryFn: () => base44.entities.CareerCoachSession.list('-created_date'),
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['interactions'],
    queryFn: () => base44.entities.Interaction.list(),
  });

  const updateActionItemMutation = useMutation({
    mutationFn: async ({ sessionId, actionItems }) => {
      return base44.entities.CareerCoachSession.update(sessionId, { action_items: actionItems });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coachingSessions']);
      toast.success('Action item updated');
    }
  });

  const generateCoachingSession = async () => {
    setGenerating(true);
    try {
      // Gather user data
      const latestResume = resumes[0];
      const completedInterviews = interviews.filter(i => i.status === 'completed');
      const avgInterviewScore = completedInterviews.length > 0
        ? completedInterviews.reduce((sum, i) => sum + (i.overall_score || 0), 0) / completedInterviews.length
        : null;

      // Build comprehensive prompt
      const prompt = `You are an expert career coach conducting a ${selectedSessionType} coaching session.

**User Profile:**
- Name: ${currentUser?.full_name || 'User'}
- Current Role: ${currentUser?.current_position || 'Not specified'} at ${currentUser?.current_company || 'N/A'}
- LinkedIn: ${currentUser?.linkedin_profile || 'Not provided'}
- Bio: ${currentUser?.bio || 'Not provided'}

**Resume Information:**
${latestResume ? `- Latest Resume: ${latestResume.version_name}
- Target Role: ${latestResume.target_role || 'Not specified'}
- Target Industry: ${latestResume.target_industry || 'Not specified'}
- Resume Score: ${latestResume.optimization_score || 'Not yet analyzed'}/100` : '- No resume uploaded yet'}

**Interview Performance:**
- Total Interviews Completed: ${completedInterviews.length}
${avgInterviewScore ? `- Average Interview Score: ${Math.round(avgInterviewScore)}/100` : '- No interviews completed yet'}
${completedInterviews.length > 0 ? `- Recent Interview Feedback: ${completedInterviews[0]?.overall_feedback?.substring(0, 200) || 'N/A'}` : ''}

**Network Statistics:**
- Total Contacts: ${contacts.length}
- High Relevance Contacts: ${contacts.filter(c => c.relevance_score === 'high').length}
- Recent Interactions: ${interactions.length}
- Top Industries: ${[...new Set(contacts.map(c => c.industry).filter(Boolean))].slice(0, 3).join(', ') || 'Not specified'}

**Session Type:** ${selectedSessionType}

Based on this comprehensive profile, provide:

1. **Career Advice**: Personalized career guidance (2-3 paragraphs)
2. **Job Search Strategy**: Specific tactics for their job search (2-3 paragraphs)
3. **Skill Recommendations**: 5-7 skills to develop with priority levels (high/medium/low), reasoning, and learning resources
4. **Action Items**: 5-8 concrete tasks with realistic deadlines (use format like "1 week", "2 weeks", "1 month")
5. **Strengths**: 4-6 identified strengths based on their profile
6. **Areas for Improvement**: 3-5 areas needing development
7. **Target Roles**: 3-5 specific job titles they should target
8. **Networking Strategy**: Specific networking recommendations based on their network

Be specific, actionable, and encouraging. Reference their actual data points.

Return as JSON:`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: latestResume?.file_url ? [latestResume.file_url] : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            career_advice: { type: "string" },
            job_search_strategy: { type: "string" },
            skill_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  skill: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  reasoning: { type: "string" },
                  resources: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            },
            action_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  deadline: { type: "string" },
                  completed: { type: "boolean" }
                }
              }
            },
            strengths: {
              type: "array",
              items: { type: "string" }
            },
            areas_for_improvement: {
              type: "array",
              items: { type: "string" }
            },
            target_roles: {
              type: "array",
              items: { type: "string" }
            },
            networking_strategy: { type: "string" }
          }
        }
      });

      // Create coaching session
      const session = await base44.entities.CareerCoachSession.create({
        session_type: selectedSessionType,
        career_advice: result.career_advice,
        job_search_strategy: result.job_search_strategy,
        skill_recommendations: result.skill_recommendations,
        action_items: result.action_items.map(item => ({ ...item, completed: false })),
        strengths: result.strengths,
        areas_for_improvement: result.areas_for_improvement,
        target_roles: result.target_roles,
        networking_strategy: result.networking_strategy
      });

      setActiveSession(session);
      setActiveView('session'); // Set view to session after generating a report
      queryClient.invalidateQueries(['coachingSessions']);
      toast.success('Career coaching session generated! 🎯');
    } catch (error) {
      toast.error('Error generating coaching session');
      console.error(error);
    }
    setGenerating(false);
  };

  const toggleActionItem = (session, actionIndex) => {
    const updatedActionItems = [...session.action_items];
    updatedActionItems[actionIndex].completed = !updatedActionItems[actionIndex].completed;
    updateActionItemMutation.mutate({
      sessionId: session.id,
      actionItems: updatedActionItems
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // If activeSession is null and there are coachingSessions, default to the latest one.
  // This ensures `displaySession` is always populated if a report exists.
  const displaySession = activeSession || coachingSessions[0];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
          <Sparkles className="w-9 h-9 text-purple-600" />
          AI Career Coach
        </h1>
        <p className="text-slate-600 mt-1">
          Explore career options, plan your path, and get personalized guidance
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-3">
        <Button
          onClick={() => setActiveView('chat')}
          variant={activeView === 'chat' ? 'default' : 'outline'}
          className={activeView === 'chat' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-slate-300'}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Interactive Coach
        </Button>
        <Button
          onClick={() => setActiveView('session')}
          variant={activeView === 'session' ? 'default' : 'outline'}
          className={activeView === 'session' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-slate-300'}
        >
          <Target className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Interactive Chat View */}
      {activeView === 'chat' && (
        <CareerCoachChat 
          conversationId={currentConversationId}
          onConversationCreated={(conv) => setCurrentConversationId(conv.id)}
        />
      )}

      {/* Session Report View */}
      {activeView === 'session' && (
        <>
          {/* Generate New Session */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Generate Career Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Report Focus
                  </label>
                  <Select
                    value={selectedSessionType}
                    onValueChange={setSelectedSessionType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprehensive">Comprehensive Review</SelectItem>
                      <SelectItem value="career_path">Career Path Strategy</SelectItem>
                      <SelectItem value="job_search">Job Search Tactics</SelectItem>
                      <SelectItem value="skill_development">Skill Development</SelectItem>
                      <SelectItem value="interview_prep">Interview Preparation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={generateCoachingSession}
                    disabled={generating}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing your profile...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-white/60 rounded-lg p-4 text-sm text-slate-600">
                <p className="font-medium mb-2">Your report will analyze:</p>
                <div className="grid md:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Profile & Background
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Resume & Skills
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Interview Performance
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Network Strength
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Session */}
          {displaySession && (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 max-w-3xl">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="actions">Action Plan</TabsTrigger>
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-emerald-700">
                        <Award className="w-5 h-5" />
                        Your Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {displaySession.strengths?.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Areas for Improvement */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-amber-700">
                        <TrendingUp className="w-5 h-5" />
                        Growth Areas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {displaySession.areas_for_improvement?.map((area, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Target Roles */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Recommended Target Roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {displaySession.target_roles?.map((role, idx) => (
                        <Badge key={idx} className="bg-indigo-100 text-indigo-700 border-indigo-200 px-3 py-1">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Career Advice */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Career Advice
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {displaySession.career_advice}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-4">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Skill Development Roadmap
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {displaySession.skill_recommendations?.map((skill, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-slate-900 text-lg">{skill.skill}</h4>
                          <Badge className={`border ${getPriorityColor(skill.priority)}`}>
                            {skill.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{skill.reasoning}</p>
                        {skill.resources && skill.resources.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              📚 Learning Resources:
                            </p>
                            <ul className="space-y-1">
                              {skill.resources.map((resource, ridx) => (
                                <li key={ridx} className="text-sm text-blue-600 flex items-center gap-2">
                                  <ChevronRight className="w-3 h-3" />
                                  {resource}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Action Plan Tab */}
              <TabsContent value="actions" className="space-y-4">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Your Action Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {displaySession.action_items?.map((action, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                          action.completed
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <Checkbox
                          checked={action.completed}
                          onCheckedChange={() => toggleActionItem(displaySession, idx)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${
                            action.completed ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}>
                            {action.task}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                            <Clock className="w-3 h-3" />
                            {action.deadline}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Strategy Tab */}
              <TabsContent value="strategy" className="space-y-4">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Job Search Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line mb-6">
                      {displaySession.job_search_strategy}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Networking Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {displaySession.networking_strategy}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="space-y-4">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Session Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-1">Session Type</p>
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          {displaySession.session_type}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-1">Created</p>
                        <p className="text-sm text-slate-900">
                          {format(new Date(displaySession.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-1">Action Items</p>
                        <p className="text-sm text-slate-900">
                          {displaySession.action_items?.filter(a => a.completed).length || 0} of {displaySession.action_items?.length || 0} completed
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-1">Skills to Develop</p>
                        <p className="text-sm text-slate-900">
                          {displaySession.skill_recommendations?.length || 0} recommendations
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Past Sessions */}
          {coachingSessions.length > 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Past Coaching Sessions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {coachingSessions.slice(1).map(session => {
                  const completedActions = session.action_items?.filter(a => a.completed).length || 0;
                  const totalActions = session.action_items?.length || 0;
                  const completionRate = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;

                  return (
                    <Card
                      key={session.id}
                      className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => setActiveSession(session)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 mb-2">
                              {session.session_type}
                            </Badge>
                            <p className="text-sm text-slate-600">
                              {format(new Date(session.created_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900">{Math.round(completionRate)}%</p>
                            <p className="text-xs text-slate-500">completed</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            {totalActions} action items
                          </div>
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            {session.skill_recommendations?.length || 0} skill recommendations
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {!displaySession && coachingSessions.length === 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Reports Yet</h3>
                <p className="text-slate-600">
                  Generate your first career report or start an interactive coaching session
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
