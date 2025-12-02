import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarDays,
  Plus,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  Circle,
  RefreshCw,
  XCircle,
  AlertCircle,
  Bot,
  BrainCircuit,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { runResilientAgent } from '@/components/utils/agentArchitecture';
// Re-trigger build

import EventDialog from '../components/events/EventDialog';
import EventDiscovery from '../components/events/EventDiscovery';
import EventActions from '../components/events/EventActions';
import AddToCalendar from '../components/common/AddToCalendar';
import NetworkingAssistant from '../components/events/NetworkingAssistant';
import EventbriteHelpDialog from '../components/events/EventbriteHelpDialog';
import { useTranslation } from "@/components/i18n/TranslationContext";

export default function Events() {
  const { t } = useTranslation('events');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
  const [syncMessage, setSyncMessage] = useState({ title: '', description: '' });
  const [agentThought, setAgentThought] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Ensure consistent Redirect URI (strip trailing slash)
  const getRedirectUri = () => {
      if (typeof window === 'undefined') return '';
      return window.location.origin + window.location.pathname.replace(/\/$/, "");
  };
  
  // Check for OAuth Code on mount
  React.useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      
      if (code) {
          handleOAuthCallback(code);
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
      }
  }, []);

  const handleOAuthCallback = async (code) => {
      setSyncStatus('syncing');
      setAgentThought({ message: "Authenticating with Eventbrite...", status: "working" });
      
      try {
          const redirectUri = getRedirectUri();
          await base44.functions.invoke('eventbriteAuth', { code, redirect_uri: redirectUri });
          toast.success("Successfully connected to Eventbrite!");
          setAgentThought({ message: "Authentication successful. Syncing events...", status: "working" });
          syncEventbriteEvents(); 
      } catch (error) {
          console.error("OAuth Error", error);
          setSyncStatus('error');
          
          let errorMessage = error.message || "Unknown error";
          let details = "";

          // Safely extract backend error info
          try {
            if (error.response && error.response.data) {
                const backendData = error.response.data;
                if (backendData.error) errorMessage = backendData.error;
                
                if (backendData.details) {
                    details = typeof backendData.details === 'object' 
                      ? JSON.stringify(backendData.details) 
                      : String(backendData.details);
                }
            }
          } catch (e) {
            console.error("Error parsing error response", e);
          }

          setSyncMessage({
              title: "Connection Failed",
              description: `Authentication failed: ${errorMessage}. ${details ? 'Details: ' + details : ''} Please check that your 'Redirect URI' in Eventbrite settings matches exactly: ${window.location.origin + window.location.pathname}`
          });
      }
  };

  const handleConnect = () => {
      // Use the App's URL as redirect URI
      const redirectUri = window.location.origin + window.location.pathname;
      // We need the Client ID (API Key) - assuming it's safe to expose or fetch via a small helper, 
      // but usually we can't access secrets in frontend.
      // Best practice: Ask backend for the auth URL.
      // For speed, we'll hardcode the redirect logic but we need the Client ID.
      // Let's use a backend function to get the auth URL to keep secrets safe if needed, 
      // or just ask the user to ensure the key is public safe? 
      // Actually, Client ID is public. But we don't have it in frontend env.
      // We'll just trigger the sync, and if it fails with NO_TOKEN, we show the connect flow 
      // which might need to fetch the Client ID from a simple backend call or we hardcode if user provided it.
      // Since we don't have the ID in frontend, let's add a helper function or just fail gracefully.
      // Better: Use a simple function to get the config.
      initiateConnection();
  };

  const initiateConnection = async () => {
      setIsConnecting(true);
      try {
          const res = await base44.functions.invoke('eventbriteAuth', { action: 'get_config' });
          
          if (res.data && res.data.client_id) {
              const redirectUri = getRedirectUri();
              
              // Check for iframe environment (Preview Mode)
              if (window.self !== window.top) {
                  toast.warning(
                      "Preview Mode Detected: Eventbrite may block the connection popup. Please open in a New Tab if it fails.", 
                      { duration: 6000, action: { label: 'Open New Tab', onClick: () => window.open(window.location.href, '_blank') } }
                  );
                  await new Promise(resolve => setTimeout(resolve, 2000));
              }

              console.log("Redirect URI:", redirectUri);
              toast.info("Connecting to Eventbrite...", { duration: 2000 });

              window.location.href = `https://www.eventbrite.com/oauth/authorize?response_type=code&client_id=${res.data.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}`;
          } else {
              const errMsg = res.data?.error || "Missing Client ID";
              toast.error(`Configuration Error: ${errMsg}. Click the '?' help button for setup instructions.`);
              setIsConnecting(false);
          }
      } catch (error) {
          console.error("Failed to initiate connection:", error);
          toast.error("Failed to connect to backend. Please check your network or try again later.");
          setIsConnecting(false);
      }
  };

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Event.filter({ created_by: user.email }, '-date');
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Contact.filter({ created_by: user.email });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      toast.success('Event deleted');
    },
  });

  const toggleAttendedMutation = useMutation({
    mutationFn: ({ id, attended }) => base44.entities.Event.update(id, { attended }),
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
    },
  });

  const syncEventbriteEvents = async () => {
    setSyncStatus('syncing');
    setAgentThought({ message: "Initializing Connectivity Agent...", status: "working" });
    
    try {
      // Wrap the operation in our Agent Framework
      await runResilientAgent({
        agentName: 'EventbriteConnector',
        taskName: 'Sync User Events',
        onThought: (thought) => setAgentThought(thought),
        maxAttempts: 3,
        operation: async () => {
          // Using SDK to invoke function
          const response = await base44.functions.invoke('getUserEvents', {});

          // SDK returns Axios-like response object
          if (response.status !== 200) {
              if (response.status >= 500) throw new Error('Network instability detected');
              throw new Error(`Connection failed (${response.status}): ${response.data?.error || 'Unknown error'}`);
          }

          const data = response.data;
          if (data.error) throw new Error(data.error);

          // Process Data
          let addedCount = 0;
          if (data.events && data.events.length > 0) {
            for (const ebEvent of data.events) {
              const title = ebEvent.name?.text || ebEvent.name || 'Untitled Event';
              const existing = events.find(e => e.title === title);
              
              if (!existing) {
                await base44.entities.Event.create({
                title: title,
                date: format(new Date(ebEvent.start?.local || ebEvent.start || new Date()), 'yyyy-MM-dd'),
                time: format(new Date(ebEvent.start?.local || ebEvent.start || new Date()), 'HH:mm'),
                location: 'Online/Venue',
                type: 'networking',
                description: (ebEvent.description?.text || ebEvent.description || '').substring(0, 500),
                follow_up_required: true,
                attended: false,
                url: ebEvent.url || ebEvent.resource_uri,
                platform: 'Eventbrite'
                });
                addedCount++;
              }
            }
            queryClient.invalidateQueries(['events']);
            setSyncMessage({ 
              title: t('syncComplete'), 
              description: t('syncSuccessDesc', { count: addedCount })
            });
          } else {
            setSyncMessage({ 
              title: t('syncComplete'), 
              description: t('syncNoEvents')
            });
          }
          return data;
        },
        // Refinement Strategies (Self-Correction)
        fallbacks: [
          {
            name: "Public Event Discovery (Fallback)",
            fn: async () => {
              // If user sync fails, try fetching public events as a fallback to give SOMETHING
              // This is "expanding scope" -> if A fails, try B
              const response = await base44.functions.invoke('searchEvents', { query: 'networking' });
              const data = response.data;

              if (data.events) {
                 setSyncMessage({ 
                   title: t('syncFailed'), 
                   description: 'Could not access your private events, but found some public networking events for you instead.' 
                 });
                 return data;
              }
              throw new Error("Fallback also failed");
            }
          }
        ]
      });

      setSyncStatus('success');
    } catch (error) {
      console.error('Eventbrite Sync Error:', error);
      console.error('Full Sync Error:', error);
      
      // Extract detailed error from backend response if available
      let detailedError = error.message || t('syncError');
      let tip = null;

      if (error.response && error.response.data) {
          const backendData = error.response.data;
          if (backendData.error) detailedError = backendData.error;
          if (backendData.tip) tip = backendData.tip;
          if (backendData.details) detailedError += ` (${backendData.details})`;
      } else if (error.message && error.message.includes('400')) {
          detailedError = "Authentication Error: The API Key provided is invalid or has insufficient permissions.";
          tip = "Please ensure you are using the 'Private Token' (starts with 'sk_...'), NOT the Public API Key.";
      }

      setSyncMessage({ 
        title: t('syncFailed'), 
        description: detailedError,
        tip: tip
      });
      setSyncStatus('error');
    }
  };

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.date) < new Date());

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
            <CalendarDays className="w-9 h-9" />
            {t('title')}
          </h1>
          <p className="text-slate-600 mt-1">
            {t('subtitle')}
          </p>
        </div>
        
        <div className="flex gap-3">
          <NetworkingAssistant events={events} contacts={contacts} />
          <div className="flex gap-1">
            <Button 
                onClick={handleConnect}
                disabled={syncStatus === 'syncing' || isConnecting}
                variant="outline"
                className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 rounded-r-none border-r-0"
            >
                <RefreshCw className={`w-4 h-4 mr-2 ${(syncStatus === 'syncing' || isConnecting) ? 'animate-spin' : ''}`} />
                {isConnecting ? "Connecting..." : t('syncEventbrite')}
            </Button>
            <Button
                variant="outline"
                className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 rounded-l-none px-2"
                onClick={() => setHelpOpen(true)}
                title="Connection Help"
            >
                <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            onClick={() => {
              setEditingEvent(null);
              setDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addEvent')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="upcoming">{t('tabs.upcoming')}</TabsTrigger>
          <TabsTrigger value="discover">{t('tabs.discover')}</TabsTrigger>
          <TabsTrigger value="past">{t('tabs.past')}</TabsTrigger>
        </TabsList>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-6">
          <EventDiscovery onAddEvent={() => queryClient.invalidateQueries(['events'])} />
        </TabsContent>

        {/* Upcoming Events Tab */}
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingEvents.length === 0 ? (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-blue-50">
              <CardContent className="p-12 text-center">
                <CalendarDays className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t('noUpcoming')}</h3>
                <p className="text-slate-600 mb-6">
                  {t('discoverDesc')}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addEvent')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcomingEvents.map(event => {
                const attendingContacts = contacts.filter(c => 
                  event.contacts_attending?.includes(c.id)
                );

                return (
                  <div key={event.id} className="space-y-4">
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge className="mb-2 bg-blue-100 text-blue-700 border-blue-200">
                              {event.type}
                            </Badge>
                            <CardTitle className="text-xl">{event.title}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-4 h-4" />
                            {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
                            {event.time && ` at ${event.time}`}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="w-4 h-4" />
                              {event.location}
                            </div>
                          )}
                          {attendingContacts.length > 0 && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Users className="w-4 h-4" />
                              {t('contactsAttending', { count: attendingContacts.length })}
                            </div>
                          )}
                        </div>

                        {event.description && (
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingEvent(event);
                              setDialogOpen(true);
                            }}
                          >
                            {t('common:edit')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMutation.mutate(event.id)}
                          >
                            {t('common:delete')}
                          </Button>
                          <AddToCalendar event={event} />
                        </div>
                      </CardContent>
                    </Card>

                    <EventActions event={event} />
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Past Events Tab */}
        <TabsContent value="past" className="space-y-4">
          {pastEvents.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <p className="text-slate-500">{t('noPast')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pastEvents.map(event => (
                <Card key={event.id} className="border-0 shadow-md bg-slate-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleAttendedMutation.mutate({ 
                          id: event.id, 
                          attended: !event.attended 
                        })}
                        className="flex-shrink-0"
                      >
                        {event.attended ? (
                          <CheckCircle className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-slate-400" />
                        )}
                      </button>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{event.title}</h3>
                        <p className="text-sm text-slate-600">
                          {format(new Date(event.date), 'MMM d, yyyy')}
                        </p>
                        {event.url && (
                          <a 
                            href={event.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Event
                          </a>
                        )}
                      </div>
                      {event.attended && event.follow_up_required && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {t('followUpNeeded')}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingEvent}
        contacts={contacts}
      />

      <EventbriteHelpDialog 
        open={helpOpen} 
        onOpenChange={setHelpOpen}
        redirectUri={getRedirectUri()}
      />
      
      {syncStatus !== 'idle' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            
            {/* Loading State with Agent Thoughts */}
            {syncStatus === 'syncing' && (
              <>
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-75"></div>
                  <div className="relative bg-orange-50 p-4 rounded-full">
                    <Bot className="w-10 h-10 text-orange-600 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Connectivity Agent</h3>
                
                <div className="bg-slate-50 p-4 rounded-xl w-full mb-4 text-left border border-slate-100 shadow-inner">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <BrainCircuit className="w-3 h-3" /> {t('common:agentLog')}
                  </div>
                  <p className="text-sm text-slate-700 font-medium animate-pulse">
                    {agentThought?.message || t('common:initializing')}
                  </p>
                  {agentThought?.step === 'wait' && (
                    <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 animate-progress origin-left"></div>
                    </div>
                  )}
                </div>

                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                  {t('common:autoRetry')}
                </Badge>
              </>
            )}

            {/* Success State */}
            {syncStatus === 'success' && (
              <>
                <div className="bg-emerald-50 p-4 rounded-full mb-6">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{syncMessage.title}</h3>
                <p className="text-slate-600 mb-8">
                  {syncMessage.description}
                </p>
                <Button onClick={() => setSyncStatus('idle')} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                  Close
                </Button>
              </>
            )}

            {/* Error State */}
            {syncStatus === 'error' && (
              <>
                <div className="bg-red-50 p-4 rounded-full mb-6">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{syncMessage.title}</h3>
                <p className="text-slate-600 mb-4 text-sm">
                  {syncMessage.description}
                </p>
                {syncMessage.tip && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 mb-4 w-full text-left">
                        <strong>Tip:</strong> {syncMessage.tip}
                    </div>
                )}
                <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 mb-6 w-full text-left border border-slate-100">
                  <div className="flex items-center gap-2 mb-1 font-semibold">
                    <AlertCircle className="w-3 h-3" /> {t('common:troubleshooting')}:
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>{t('common:checkInternet')}</li>
                    <li>{t('common:verifyApiKey')}</li>
                    <li>{t('common:ensureBackend')}</li>
                  </ul>
                </div>
                <Button onClick={() => setSyncStatus('idle')} variant="outline" className="w-full border-slate-200 hover:bg-slate-50">
                  {t('common:close')}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}