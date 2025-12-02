import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2,
  Circle,
  UserPlus,
  MessageSquare,
  FileQuestion,
  Share2,
  Loader2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const ACTION_ICONS = {
  contact_speaker: MessageSquare,
  add_attendee_linkedin: UserPlus,
  prepare_questions: FileQuestion,
  share_insights: Share2,
};

export default function EventActions({ event }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: actions = [] } = useQuery({
    queryKey: ['eventActions', event.id],
    queryFn: () => base44.entities.EventAction.filter({ event_id: event.id }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ actionId, completed }) => 
      base44.entities.EventAction.update(actionId, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries(['eventActions']);
      toast.success('Action updated!');
    },
  });

  const generateActions = async () => {
    setGenerating(true);
    try {
      const prompt = `For a networking event called "${event.title}", suggest 4-5 strategic actions to maximize networking value.

Event details:
- Type: ${event.type}
- Location: ${event.location}
${event.description ? `- Description: ${event.description}` : ''}

Generate actionable steps that help build meaningful connections. Include:
- Who to connect with (speakers, specific attendees, organizers)
- What to prepare beforehand
- How to follow up after

Return as JSON:
{
  "actions": [
    {"type": "contact_speaker", "description": "specific action", "target": "person name if applicable"},
    {"type": "add_attendee_linkedin", "description": "specific action", "target": "person/role"},
    {"type": "prepare_questions", "description": "specific action", "target": null},
    {"type": "share_insights", "description": "specific action", "target": null}
  ]
}

Types available: contact_speaker, add_attendee_linkedin, prepare_questions, follow_up, share_insights`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  description: { type: "string" },
                  target: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.actions) {
        for (const action of result.actions) {
          await base44.entities.EventAction.create({
            event_id: event.id,
            action_type: action.type,
            description: action.description,
            target_person: action.target || '',
            completed: false
          });
        }
        queryClient.invalidateQueries(['eventActions']);
        toast.success('Action plan generated! ✨');
      }
    } catch (error) {
      toast.error('Error generating actions');
      console.error(error);
    }
    setGenerating(false);
  };

  if (actions.length === 0) {
    return (
      <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="p-6 text-center">
          <FileQuestion className="w-12 h-12 mx-auto mb-3 text-blue-600" />
          <h4 className="font-semibold text-slate-900 mb-2">No Action Plan Yet</h4>
          <p className="text-sm text-slate-600 mb-4">
            Get AI-powered suggestions for maximizing this event
          </p>
          <Button
            onClick={generateActions}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Action Plan'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const completedCount = actions.filter(a => a.completed).length;
  const progressPercent = (completedCount / actions.length) * 100;

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-slate-900">Action Plan</h4>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {completedCount}/{actions.length} Done
          </Badge>
        </div>

        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.action_type] || Circle;
            
            return (
              <div
                key={action.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  action.completed 
                    ? 'bg-emerald-50 border border-emerald-200' 
                    : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => toggleMutation.mutate({ 
                    actionId: action.id, 
                    completed: !action.completed 
                  })}
                  className="flex-shrink-0 mt-0.5"
                >
                  {action.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <Icon className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                    <p className={`text-sm font-medium ${
                      action.completed ? 'text-slate-600 line-through' : 'text-slate-900'
                    }`}>
                      {action.description}
                    </p>
                  </div>
                  {action.target_person && (
                    <p className="text-xs text-slate-500 ml-6">
                      Target: {action.target_person}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {completedCount < actions.length && (
          <Button
            variant="outline"
            size="sm"
            onClick={generateActions}
            disabled={generating}
            className="w-full mt-4"
          >
            Regenerate Action Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}