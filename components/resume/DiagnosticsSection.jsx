import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function DiagnosticsSection({ diagnostics }) {
  if (!diagnostics) return null;

  const getScoreIcon = (score) => {
    if (score >= 80) return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (score >= 60) return <Info className="w-4 h-4 text-amber-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Diagnostics</h3>
        
        <Accordion type="single" collapsible className="w-full">
          {diagnostics.overall_length && (
            <AccordionItem value="length">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {getScoreIcon(diagnostics.overall_length.score)}
                  <span className="font-medium">Overall Length</span>
                  <Badge variant="outline" className="ml-auto mr-2">
                    {diagnostics.overall_length.score}/100
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {diagnostics.overall_length.positions}
                      </div>
                      <div className="text-xs text-slate-600">Positions</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {diagnostics.overall_length.bullets}
                      </div>
                      <div className="text-xs text-slate-600">Bullets</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {diagnostics.overall_length.total_words}
                      </div>
                      <div className="text-xs text-slate-600">Words</div>
                    </div>
                  </div>
                  {diagnostics.overall_length.messages?.map((msg, idx) => (
                    <p key={idx} className="text-sm text-slate-600">{msg}</p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {diagnostics.consistency && (
            <AccordionItem value="consistency">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {getScoreIcon(diagnostics.consistency.score)}
                  <span className="font-medium">Consistency</span>
                  <Badge variant="outline" className="ml-auto mr-2">
                    {diagnostics.consistency.score}/100
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {diagnostics.consistency.messages?.map((msg, idx) => (
                    <p key={idx} className="text-sm text-slate-600">{msg}</p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {diagnostics.bullets_quality && (
            <AccordionItem value="quality">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {getScoreIcon(diagnostics.bullets_quality.score)}
                  <span className="font-medium">Bullets Quality</span>
                  <Badge variant="outline" className="ml-auto mr-2">
                    {diagnostics.bullets_quality.score}/100
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {diagnostics.bullets_quality.action_verbs_pct}%
                      </div>
                      <div className="text-xs text-slate-600">Action Verbs</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">
                        {diagnostics.bullets_quality.quantified_pct}%
                      </div>
                      <div className="text-xs text-slate-600">Quantified</div>
                    </div>
                  </div>
                  {diagnostics.bullets_quality.messages?.map((msg, idx) => (
                    <p key={idx} className="text-sm text-slate-600">{msg}</p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {diagnostics.bullet_balance && (
            <AccordionItem value="balance">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {getScoreIcon(diagnostics.bullet_balance.score)}
                  <span className="font-medium">Bullet Balance</span>
                  <Badge variant="outline" className="ml-auto mr-2">
                    {diagnostics.bullet_balance.score}/100
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-xl font-bold text-slate-900">
                        {diagnostics.bullet_balance.avg_bullets_per_position}
                      </div>
                      <div className="text-xs text-slate-600">Avg bullets/position</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-xl font-bold text-slate-900">
                        {diagnostics.bullet_balance.avg_chars_per_bullet}
                      </div>
                      <div className="text-xs text-slate-600">Avg chars/bullet</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-xl font-bold text-slate-900">
                        {diagnostics.bullet_balance.avg_words_per_bullet}
                      </div>
                      <div className="text-xs text-slate-600">Avg words/bullet</div>
                    </div>
                  </div>
                  {diagnostics.bullet_balance.messages?.map((msg, idx) => (
                    <p key={idx} className="text-sm text-slate-600">{msg}</p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}