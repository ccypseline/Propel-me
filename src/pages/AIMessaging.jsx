import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sparkles, 
  Copy, 
  RefreshCw,
  MessageSquare,
  Loader2,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import AddToCalendar from '../components/common/AddToCalendar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, addDays } from 'date-fns';

export default function AIMessaging() {
  const [selectedContact, setSelectedContact] = useState('');
  const [messageType, setMessageType] = useState('reconnect');
  const [tone, setTone] = useState('professional');
  const [context, setContext] = useState('');
  const [generatedMessages, setGeneratedMessages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [reminderDate, setReminderDate] = useState(new Date());

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date'),
  });

  const generateMessages = async () => {
    if (!selectedContact) {
      toast.error('Please select a contact');
      return;
    }

    setGenerating(true);
    setGeneratedMessages([]);

    try {
      const contact = contacts.find(c => c.id === selectedContact);
      
      const prompt = `Generate 3 different LinkedIn message variations for the following scenario:

Contact Details:
- Name: ${contact.first_name} ${contact.last_name}
- Position: ${contact.position || 'Unknown'}
- Company: ${contact.company || 'Unknown'}
- Relationship warmth: ${contact.warmth_score}
- Last interaction: ${contact.last_interaction_date || 'Never'}

Message Type: ${messageType}
Tone: ${tone}
${context ? `Additional Context: ${context}` : ''}

Message Type Guidelines:
- reconnect: Warm reconnection message, reference past connection, ask about their current work
- check_in: Casual check-in, show genuine interest, share something valuable
- ask_advice: Respectfully ask for their expertise/guidance on a specific topic
- coffee_chat: Suggest meeting for coffee/virtual call, be specific about mutual benefit
- share_value: Share an article/insight they might find valuable, no ask
- job_inquiry: Professionally inquire about opportunities at their company

Requirements:
- Keep each message under 150 words
- Be genuine and personable, not salesy
- Include a clear but soft call-to-action
- Reference their specific role/company when relevant
- Vary the approaches across the 3 versions (different opening, different angle)
- Make it feel natural for ${tone} tone
- For ${contact.warmth_score} relationships, adjust familiarity level accordingly

Return ONLY a JSON object with this exact structure:
{
  "messages": [
    {"version": "Direct", "text": "message text here"},
    {"version": "Friendly", "text": "message text here"},
    {"version": "Value-First", "text": "message text here"}
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            messages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  version: { type: "string" },
                  text: { type: "string" }
                }
              }
            }
          }
        }
      });

      setGeneratedMessages(result.messages || []);
      toast.success('Messages generated successfully! ✨');
    } catch (error) {
      toast.error('Error generating messages');
      console.error(error);
    }

    setGenerating(false);
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const selectedContactData = contacts.find(c => c.id === selectedContact);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
          <Sparkles className="w-9 h-9 text-blue-600" />
          AI Messaging Assistant
        </h1>
        <p className="text-slate-600 mt-1">
          Generate personalized messages powered by AI
        </p>
      </div>

      {/* Input Form */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Message Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Select Contact *</Label>
              <Select value={selectedContact} onValueChange={setSelectedContact}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} - {contact.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reconnect">Reconnect</SelectItem>
                  <SelectItem value="check_in">Check In</SelectItem>
                  <SelectItem value="ask_advice">Ask for Advice</SelectItem>
                  <SelectItem value="coffee_chat">Coffee Chat Request</SelectItem>
                  <SelectItem value="share_value">Share Value</SelectItem>
                  <SelectItem value="job_inquiry">Job Inquiry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Additional Context (Optional)</Label>
              <Textarea
                placeholder="Add any specific details, recent news about them, shared interests, etc."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {selectedContactData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Contact Preview:</p>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>{selectedContactData.first_name} {selectedContactData.last_name}</strong></p>
                <p>{selectedContactData.position} at {selectedContactData.company}</p>
                <p>Warmth: {selectedContactData.warmth_score} | Relevance: {selectedContactData.relevance_score}</p>
              </div>
            </div>
          )}

          <Button 
            onClick={generateMessages}
            disabled={generating || !selectedContact}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Messages...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Messages
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Messages */}
      {generatedMessages.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Generated Messages</h2>
          
          {generatedMessages.map((msg, idx) => (
            <Card key={idx} className="border-0 shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    {msg.version}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(msg.text, idx)}
                  >
                    {copiedIndex === idx ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        Remind Me
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="end">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Set Reminder Date</h4>
                        <CalendarComponent
                          mode="single"
                          selected={reminderDate}
                          onSelect={setReminderDate}
                          initialFocus
                        />
                        <AddToCalendar 
                          event={{
                            title: `Send message to ${selectedContactData?.first_name || 'Contact'}`,
                            description: `Message draft:\n\n${msg.text}`,
                            date: reminderDate,
                            time: '09:00',
                            location: 'LinkedIn'
                          }}
                          className="w-full"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-slate-900 whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={generateMessages}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate Messages
          </Button>
        </div>
      )}
    </div>
  );
}
