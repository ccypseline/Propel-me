import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Search, 
  MapPin, 
  Calendar,
  ExternalLink,
  Plus,
  Loader2,
  Sparkles,
  Globe,
  Filter
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function EventDiscovery({ onAddEvent }) {
  const [searching, setSearching] = useState(false);
  const [recommendingAI, setRecommendingAI] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [platform, setPlatform] = useState('all');
  const [results, setResults] = useState([]);

  useEffect(() => {
    // Auto-search on mount
    searchEvents("Professional Networking", "Online");
  }, []);

  const searchEvents = async (overrideQuery, overrideLocation) => {
    const query = overrideQuery || searchQuery;
    const loc = overrideLocation || location;

    if (!query && !loc) {
      toast.error('Please enter search terms or location');
      return;
    }

    if (overrideQuery) setSearchQuery(overrideQuery);
    if (overrideLocation) setLocation(overrideLocation);

    setSearching(true);
    try {
      // Use LLM to "search" across multiple platforms by leveraging its training + internet access
      const prompt = `
        Find me 5 upcoming real-world or virtual events related to: "${query}" in "${loc}".
        
        Platforms to check: ${platform === 'all' ? 'Eventbrite, Meetup, Luma, LinkedIn' : platform}.
        
        Return a JSON object with an "events" array. Each event needs:
        - name (string)
        - date (YYYY-MM-DD format, strictly future dates)
        - time (HH:MM format)
        - location (string)
        - platform (string)
        - url (string, valid link if possible)
        - is_virtual (boolean)
        - description (short summary)
        
        If specific data isn't available, make a reasonable best guess based on the event context or leave blank.
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
            type: "object",
            properties: {
                events: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            date: { type: "string" },
                            time: { type: "string" },
                            location: { type: "string" },
                            platform: { type: "string" },
                            url: { type: "string" },
                            is_virtual: { type: "boolean" },
                            description: { type: "string" }
                        }
                    }
                }
            }
        }
      });

      const foundEvents = response.events || [];
      setResults(foundEvents);
      
      if (foundEvents.length === 0) {
        toast.info('No events found. Try different search terms.');
      } else {
        toast.success(`Found ${foundEvents.length} events from multiple platforms!`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to discover events. Please try again later.');
      setResults([]);
    }
    setSearching(false);
  };

  const getAIRecommendations = async () => {
    setRecommendingAI(true);
    try {
      // Get user's contacts and settings for context
      const user = await base44.auth.me();
      const contacts = await base44.entities.Contact.filter({ created_by: user.email });
      const settings = await base44.entities.UserSettings.filter({ created_by: user.email });
      const profile = await base44.entities.UserCareerProfile.filter({ created_by: user.email });
      
      const userProfile = profile[0] || {};
      
      const industries = [...new Set(contacts.map(c => c.industry).filter(Boolean))].slice(0, 5);
      const interests = userProfile.target_industries || industries;

      const prompt = `
        Based on a professional's profile, suggest 3 specific event search queries.
        
        Context:
        - Target Role: ${userProfile.dream_roles?.join(', ') || 'Growth'}
        - Interests: ${interests.join(', ') || 'Tech'}
        - Location: ${userProfile.preferred_locations?.[0] || 'Remote'}
        
        Return ONLY a JSON object:
        {
          "searches": [
            {"query": "string", "location": "string", "reason": "string"}
          ]
        }
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            searches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  query: { type: "string" },
                  location: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.searches && result.searches.length > 0) {
        const firstSearch = result.searches[0];
        setSearchQuery(firstSearch.query);
        setLocation(firstSearch.location);
        
        toast.success(`AI Suggestion: ${firstSearch.reason}`);
        searchEvents(firstSearch.query, firstSearch.location);
      }
    } catch (error) {
      toast.error('Error getting AI recommendations');
      console.error(error);
    }
    setRecommendingAI(false);
  };

  const addToMyEvents = async (discoveredEvent) => {
    try {
      await base44.entities.Event.create({
        title: discoveredEvent.name,
        date: discoveredEvent.date || format(new Date(), 'yyyy-MM-dd'),
        time: discoveredEvent.time || '09:00',
        location: discoveredEvent.location || 'Online',
        is_virtual: discoveredEvent.is_virtual || false,
        virtual_link: discoveredEvent.url || '',
        type: 'networking',
        platform: discoveredEvent.platform || 'Other',
        description: discoveredEvent.description || '',
        follow_up_required: true,
        attended: false
      });

      onAddEvent?.();
      toast.success('Event added to your calendar!');
    } catch (error) {
      toast.error('Error adding event');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Multi-Platform Event Discovery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={getAIRecommendations}
              disabled={recommendingAI}
              variant="outline"
              className="bg-white/50 hover:bg-white text-purple-700 border-purple-200"
            >
              {recommendingAI ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Recommendations
            </Button>
            
            <div className="flex-1" />
            
            <select 
                className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
            >
                <option value="all">All Platforms</option>
                <option value="Meetup">Meetup</option>
                <option value="Eventbrite">Eventbrite</option>
                <option value="Luma">Luma</option>
                <option value="LinkedIn">LinkedIn</option>
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="e.g., Tech Networking, Product Management"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
                onKeyPress={(e) => e.key === 'Enter' && searchEvents()}
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Location or 'Online'"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10 bg-white"
                onKeyPress={(e) => e.key === 'Enter' && searchEvents()}
              />
            </div>
          </div>

          <Button 
            onClick={() => searchEvents()}
            disabled={searching}
            className="w-full bg-blue-600 hover:bg-blue-700 shadow-md"
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching across platforms...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Find Events
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900">
            Found {results.length} Events
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {results.map((event, idx) => (
              <Card key={idx} className="border-0 shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-5">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-slate-900 mb-2 line-clamp-2">
                              {event.name}
                            </h4>
                            <Badge variant="outline" className="mb-2">
                                {event.platform}
                            </Badge>
                        </div>
                        {event.is_virtual && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                Virtual
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-1 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {event.date} • {event.time}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </div>
                    </div>
                    
                    {event.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">
                            {event.description}
                        </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => addToMyEvents(event)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add to Calendar
                      </Button>
                      {event.url && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a href={event.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}