import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetTrigger 
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Sparkles, 
  MessageSquare, 
  Lightbulb, 
  Calendar, 
  CheckCircle2,
  Loader2,
  Copy,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function NetworkingAssistant({ events, contacts }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [followUps, setFollowUps] = useState(null);
  const [strategy, setStrategy] = useState(null);

  const { data: profile } = useQuery({
    queryKey: ['careerProfile'],
    queryFn: async () => {
      const list = await base44.entities.UserCareerProfile.list();
      return list[0];
    },
  });

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.date) < new Date());

  const analyzePrep = async () => {
    if (upcomingEvents.length === 0) {
      toast.info("No upcoming events to analyze.");
      return;
    }
    setLoading(true);
    try {
      const prompt = `
        Analyze these upcoming events for a user with the following career profile:
        Profile: ${JSON.stringify(profile)}
        Upcoming Events: ${JSON.stringify(upcomingEvents.map(e => ({ title: e.title, description: e.description, type: e.type })))}

        For the next 3 upcoming events, provide:
        1. Key types of attendees to connect with (titles, industries).
        2. 2-3 specific conversation starters or questions to ask.
        3. A "Goal" for the event.

        Return valid JSON:
        {
          "analyses": [
            { "eventTitle": "...", "targetAttendees": "...", "starters": ["..."], "goal": "..." }
          ]
        }
      `;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            analyses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  eventTitle: { type: "string" },
                  targetAttendees: { type: "string" },
                  starters: { type: "array", items: { type: "string" } },
                  goal: { type: "string" }
                }
              }
            }
          }
        }
      });
      setAnalysis(res.analyses);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate analysis");
    }
    setLoading(false);
  };

  const generateFollowUps = async () => {
    const recentPast = pastEvents.slice(0, 3); // Last 3 events
    if (recentPast.length === 0) {
      toast.info("No past events to generate follow-ups for.");
      return;
    }
    setLoading(true);
    try {
      const prompt = `
        Generate follow-up tasks and message drafts for these past events:
        Events: ${JSON.stringify(recentPast.map(e => ({ title: e.title, date: e.date })))}
        User Goal: ${profile?.dream_roles?.join(', ')}

        Return valid JSON:
        {
          "followUps": [
            { 
              "eventTitle": "...", 
              "tasks": ["..."], 
              "messageDraft": "..." 
            }
          ]
        }
      `;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            followUps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  eventTitle: { type: "string" },
                  tasks: { type: "array", items: { type: "string" } },
                  messageDraft: { type: "string" }
                }
              }
            }
          }
        }
      });
      setFollowUps(res.followUps);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate follow-ups");
    }
    setLoading(false);
  };

  const generateStrategy = async () => {
    setLoading(true);
    try {
      const prompt = `
        Provide networking strategy insights based on:
        Profile: ${JSON.stringify(profile)}
        Stats: ${events.length} total events, ${upcomingEvents.length} upcoming.
        Contacts: ${contacts.length} total contacts.

        Provide 3 key insights/recommendations to improve networking effectiveness.
        Return valid JSON:
        {
          "insights": [
            { "title": "...", "description": "..." }
          ]
        }
      `;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });
      setStrategy(res.insights);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate strategy");
    }
    setLoading(false);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg gap-2">
          <Bot className="w-4 h-4" />
          AI Assistant
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Bot className="w-6 h-6 text-violet-600" />
            Networking Assistant
          </SheetTitle>
          <SheetDescription>
            Your proactive AI coach for event preparation, follow-ups, and strategy.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="prep" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="prep">Event Prep</TabsTrigger>
            <TabsTrigger value="followup">Follow-up</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            {/* PREP TAB */}
            <TabsContent value="prep" className="mt-0 space-y-4">
              <div className="bg-violet-50 p-4 rounded-lg border border-violet-100">
                <h4 className="font-semibold text-violet-900 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Upcoming Event Analysis
                </h4>
                <p className="text-sm text-violet-700 mb-4">
                  Get customized talking points and attendee targeting for your next events.
                </p>
                <Button 
                  onClick={analyzePrep} 
                  disabled={loading || upcomingEvents.length === 0}
                  className="w-full bg-violet-600 hover:bg-violet-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Analyze Upcoming Events
                </Button>
              </div>

              {analysis && analysis.map((item, idx) => (
                <Card key={idx} className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-2 bg-slate-50/50">
                    <CardTitle className="text-base font-bold text-slate-800">
                      {item.eventTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-sm">
                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">🎯 Target Attendees:</span>
                      <p className="text-slate-600 bg-slate-50 p-2 rounded border">{item.targetAttendees}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">💬 Conversation Starters:</span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600">
                        {item.starters.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">🏆 Goal:</span>
                      <p className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {item.goal}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* FOLLOW-UP TAB */}
            <TabsContent value="followup" className="mt-0 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Smart Follow-ups
                </h4>
                <p className="text-sm text-blue-700 mb-4">
                  Generate personalized messages and tasks for recent events.
                </p>
                <Button 
                  onClick={generateFollowUps} 
                  disabled={loading || pastEvents.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Follow-ups
                </Button>
              </div>

              {followUps && followUps.map((item, idx) => (
                <Card key={idx} className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-2 bg-slate-50/50">
                    <CardTitle className="text-base font-bold text-slate-800">
                      {item.eventTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-sm">
                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">✅ Recommended Tasks:</span>
                      <ul className="space-y-1">
                        {item.tasks.map((task, i) => (
                          <li key={i} className="flex items-start gap-2 text-slate-600">
                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-700">📝 Draft Message:</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => {
                            navigator.clipboard.writeText(item.messageDraft);
                            toast.success("Draft copied!");
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border text-slate-600 italic">
                        "{item.messageDraft}"
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* STRATEGY TAB */}
            <TabsContent value="strategy" className="mt-0 space-y-4">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Strategic Insights
                </h4>
                <p className="text-sm text-amber-700 mb-4">
                  Get high-level advice on how to optimize your networking efforts.
                </p>
                <Button 
                  onClick={generateStrategy} 
                  disabled={loading}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Analyze Strategy
                </Button>
              </div>

              {strategy && strategy.map((insight, idx) => (
                <Card key={idx} className="border-l-4 border-l-amber-500 shadow-sm">
                  <CardContent className="pt-4">
                    <h5 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-amber-500" />
                      {insight.title}
                    </h5>
                    <p className="text-sm text-slate-600 pl-6">
                      {insight.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}