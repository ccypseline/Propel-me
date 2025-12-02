import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function ConversationList({ conversations, activeConversationId, onSelect, onNew }) {
  if (!conversations || conversations.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Past Conversations
          </h4>
          <Button variant="ghost" size="sm" onClick={onNew}>
            New Chat
          </Button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                activeConversationId === conv.id
                  ? 'bg-purple-50 border-purple-300'
                  : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-purple-50/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">
                    {conv.metadata?.name || 'Career Conversation'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {format(new Date(conv.created_date || conv.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                  {conv.messages?.length > 0 && (
                    <p className="text-xs text-slate-600 mt-1 truncate">
                      {conv.messages.length} messages
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}