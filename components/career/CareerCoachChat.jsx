import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  Sparkles,
  Plus,
  MessageSquare,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import MessageBubble from '../chat/MessageBubble';
import ConversationList from './ConversationList';

export default function CareerCoachChat({ conversationId, onConversationCreated }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Fetch past conversations
  const { data: pastConversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['careerCoachConversations'],
    queryFn: async () => {
      try {
        const convs = await base44.agents.listConversations({ agent_name: 'career_coach' });
        return convs || [];
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing conversation
  useEffect(() => {
    const loadConversation = async () => {
      try {
        if (conversationId) {
          const conv = await base44.agents.getConversation(conversationId);
          setConversation(conv);
          setMessages(conv.messages || []);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        toast.error('Failed to load conversation');
      }
    };

    loadConversation();
  }, [conversationId]);

  // Subscribe to conversation updates with proper cleanup
  useEffect(() => {
    if (!conversation?.id || isSubscribed) return;

    const setupSubscription = async () => {
      try {
        const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
          if (data?.messages) {
            setMessages(data.messages);
          }
        });
        
        unsubscribeRef.current = unsubscribe;
        setIsSubscribed(true);
      } catch (error) {
        console.error('Subscription error:', error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
        unsubscribeRef.current = null;
      }
      setIsSubscribed(false);
    };
  }, [conversation?.id, isSubscribed]);

  const startNewConversation = async () => {
    try {
      const newConv = await base44.agents.createConversation({
        agent_name: 'career_coach',
        metadata: {
          name: `Career Session - ${new Date().toLocaleDateString()}`,
          description: 'Career planning and strategy session'
        }
      });
      
      setConversation(newConv);
      setMessages([]);
      setIsSubscribed(false);
      setShowHistory(false);
      onConversationCreated?.(newConv);
      refetchConversations();
      toast.success('Started new conversation');
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const loadConversationById = async (convId) => {
    try {
      const conv = await base44.agents.getConversation(convId);
      setConversation(conv);
      setMessages(conv.messages || []);
      setIsSubscribed(false);
      setShowHistory(false);
      onConversationCreated?.(conv);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    if (!conversation) {
      toast.error('Please start a conversation first');
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setInputMessage(userMessage);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const starterPrompts = [
    "Help me figure out what career path is right for me",
    "I'm thinking about changing careers, can you help me plan?",
    "How can I leverage my network to advance my career?",
    "What skills should I develop for my target role?",
    "I'm a student - how do I explore different career options?"
  ];

  if (!conversation) {
    return (
      <div className="space-y-6">
        {/* Past Conversations */}
        {pastConversations.length > 0 && (
          <ConversationList
            conversations={pastConversations}
            activeConversationId={null}
            onSelect={loadConversationById}
            onNew={startNewConversation}
          />
        )}

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-purple-600" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Start Your Career Exploration
            </h3>
            <p className="text-slate-600 mb-6">
              Have a conversation with your AI career coach to explore options, plan your path, and get personalized guidance.
            </p>
            <Button
              onClick={startNewConversation}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Start Conversation
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">
            Not sure where to start? Try these:
          </h4>
          <div className="grid gap-3">
            {starterPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={async () => {
                  await startNewConversation();
                  setTimeout(() => setInputMessage(prompt), 500);
                }}
                className="text-left p-4 bg-white border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-sm text-slate-700"
              >
                <Sparkles className="w-4 h-4 inline mr-2 text-purple-600" />
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      <Card className="border-0 shadow-lg bg-white">
        <CardContent className="p-6">
          <div className="space-y-6 min-h-[400px] max-h-[600px] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p>Start the conversation by sending a message below</p>
              </div>
            ) : (
              messages.map((message, idx) => (
                <MessageBubble key={idx} message={message} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Input */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about career options, share your goals, or get advice..."
              rows={3}
              disabled={sending}
              className="flex-1 resize-none"
            />
            <Button
              onClick={sendMessage}
              disabled={sending || !inputMessage.trim()}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 h-full px-6"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          className="cursor-pointer bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
          onClick={() => setInputMessage("What are my key strengths based on my profile?")}
        >
          Analyze my strengths
        </Badge>
        <Badge 
          className="cursor-pointer bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
          onClick={() => setInputMessage("What career paths could work for me?")}
        >
          Explore career paths
        </Badge>
        <Badge 
          className="cursor-pointer bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
          onClick={() => setInputMessage("Create an action plan for me")}
        >
          Create action plan
        </Badge>
        <Badge 
          className="cursor-pointer bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
          onClick={() => setInputMessage("How can I use my network more effectively?")}
        >
          Network strategy
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => setShowHistory(!showHistory)}
          variant="outline"
          className="flex-1"
        >
          <History className="w-4 h-4 mr-2" />
          {showHistory ? 'Hide History' : 'View History'}
        </Button>
        <Button
          onClick={startNewConversation}
          variant="outline"
          className="flex-1"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {showHistory && pastConversations.length > 0 && (
        <ConversationList
          conversations={pastConversations}
          activeConversationId={conversation?.id}
          onSelect={loadConversationById}
          onNew={startNewConversation}
        />
      )}
    </div>
  );
}