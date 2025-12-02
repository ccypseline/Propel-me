import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Newspaper, 
  ExternalLink, 
  MessageCircle, 
  RefreshCw, 
  TrendingUp, 
  Building2,
  Sparkles,
  Check,
  BrainCircuit
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { runResilientAgent } from '@/components/utils/agentArchitecture';
import { useTranslation } from "@/components/i18n/TranslationContext";

export default function NetworkIntelWidget({ contacts }) {
  const { t } = useTranslation('common'); // Using common for now, could be specific
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [agentState, setAgentState] = useState(null); // { message, step }

  const { data: intel = [] } = useQuery({
    queryKey: ['marketIntel'],
    queryFn: () => base44.entities.MarketIntel.list('-date', 10),
  });

  const runIntelAgent = async () => {
    setIsAnalyzing(true);
    setAgentState({ message: t('networkIntel.init'), step: "init" });

    try {
      await runResilientAgent({
        agentName: 'NetworkIntelAgent',
        taskName: 'Scan Market News',
        onThought: (thought) => setAgentState(thought),
        maxAttempts: 2,
        operation: async (attempt) => {
          // 1. Identify Key Companies (Top 5 by relevance/count)
          const companies = {};
          contacts.forEach(c => {
            if (c.current_company) {
              companies[c.current_company] = (companies[c.current_company] || 0) + 1;
            }
          });
          
          // Sort by frequency and take top 5
          const targetCompanies = Object.entries(companies)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([name]) => name);

          if (targetCompanies.length === 0) throw new Error("No companies found in contacts to analyze.");

          // 2. Perform Deep Research
          const prompt = `
            Act as a "Chief of Staff" for a networker.
            I have contacts at these companies: ${targetCompanies.join(', ')}.
            
            Search for VERY RECENT (last 30 days) significant news for these companies 
            (Funding rounds, Product launches, IPOs, Mergers, Leadership changes).
            
            If you find nothing significant for a company, skip it.
            
            Return a JSON object with a "signals" array.
            Each signal must have:
            - company_name
            - title (headline)
            - summary (1 sentence)
            - signal_type (funding, product_launch, hiring, general_news)
            - source_url (valid url if possible, or "Search")
            - suggested_icebreaker (A casual, professional short message to a friend at that company mentioning the news)
            - relevance_score (70-100 based on impact)
          `;

          const response = await base44.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: true, // The magic switch
            response_json_schema: {
              type: "object",
              properties: {
                signals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      company_name: { type: "string" },
                      title: { type: "string" },
                      summary: { type: "string" },
                      signal_type: { type: "string" },
                      source_url: { type: "string" },
                      suggested_icebreaker: { type: "string" },
                      relevance_score: { type: "number" }
                    }
                  }
                }
              }
            }
          });

          // 3. Process & Store Results
          const newSignals = response.signals || [];
          let savedCount = 0;

          for (const signal of newSignals) {
            // Find related contacts
            const relatedContacts = contacts
              .filter(c => c.current_company?.toLowerCase().includes(signal.company_name.toLowerCase()))
              .map(c => c.id);

            // Check for duplicates (simple check by title)
            const existing = intel.find(i => i.title === signal.title);
            
            if (!existing && relatedContacts.length > 0) {
              await base44.entities.MarketIntel.create({
                ...signal,
                date: new Date().toISOString().split('T')[0],
                related_contact_ids: relatedContacts,
                is_read: false
              });
              savedCount++;
            }
          }

          queryClient.invalidateQueries(['marketIntel']);
          return { savedCount, companies: targetCompanies.length };
        }
      });
      
      toast.success(t('networkIntel.analysisComplete'));
    } catch (error) {
      console.error(error);
      toast.error(t('networkIntel.agentFailed'));
    } finally {
      setIsAnalyzing(false);
      setAgentState(null);
    }
  };

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketIntel.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries(['marketIntel'])
  });

  return (
    <Card className="h-full flex flex-col border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-slate-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            {t('networkIntel.title')}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={runIntelAgent} 
            disabled={isAnalyzing}
            className={isAnalyzing ? "animate-spin text-indigo-600" : "text-slate-400 hover:text-indigo-600"}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        {agentState && (
          <div className="text-xs text-indigo-600 font-medium animate-pulse flex items-center gap-2 bg-indigo-100/50 p-2 rounded-lg">
             <Sparkles className="w-3 h-3" />
             {agentState.message}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[300px] px-6 pb-6">
          {intel.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t('networkIntel.noSignals')}</p>
              <Button variant="link" onClick={runIntelAgent} className="text-indigo-600">
                {t('networkIntel.runAnalysis')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {intel.map((item) => (
                <div 
                  key={item.id} 
                  className={`relative group rounded-xl border p-4 transition-all hover:shadow-md ${
                    item.is_read ? 'bg-white/60 border-slate-200' : 'bg-white border-indigo-200 shadow-sm'
                  }`}
                >
                  {!item.is_read && (
                    <div className="absolute top-3 right-3 w-2 h-2 bg-indigo-500 rounded-full" />
                  )}
                  
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">
                        {item.company_name}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-slate-50">
                        {item.signal_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {item.date}
                    </span>
                  </div>

                  <h4 className="font-semibold text-slate-900 mb-1 leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                    {item.summary}
                  </p>

                  <div className="bg-indigo-50/50 rounded-lg p-2 mb-3 border border-indigo-100/50">
                    <div className="flex items-center gap-1 mb-1 text-[10px] font-semibold text-indigo-700">
                      <MessageCircle className="w-3 h-3" />
                      {t('networkIntel.suggestedIcebreaker')}
                    </div>
                    <p className="text-xs text-indigo-900/80 italic">
                      "{item.suggested_icebreaker}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex -space-x-2">
                      {item.related_contact_ids?.slice(0, 3).map((cid, i) => (
                         <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                           {/* Ideally fetch contact initials, using 'C' for now */}
                           C
                         </div>
                      ))}
                      {item.related_contact_ids?.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                          +{item.related_contact_ids.length - 3}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {!item.is_read && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 rounded-full hover:bg-emerald-50 hover:text-emerald-600"
                          onClick={() => markReadMutation.mutate(item.id)}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      {item.source_url && item.source_url !== 'Search' && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full" asChild>
                          <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}