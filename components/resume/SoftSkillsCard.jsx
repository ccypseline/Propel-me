import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export default function SoftSkillsCard({ score, skills = [], onImprove }) {
  const [expanded, setExpanded] = useState(false);
  
  const getScoreColor = () => {
    if (score === 'Strong') return 'text-emerald-600';
    if (score === 'Average') return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreNumeric = () => {
    if (score === 'Strong') return 85;
    if (score === 'Average') return 65;
    return 40;
  };

  const percentage = getScoreNumeric();

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Soft Skills Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${percentage * 2.51} 251`}
                className={getScoreColor()}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${getScoreColor()}`}>
                {score}
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-slate-600 text-center">
          This reflects how your resume showcases key transferable skills employers value.
        </p>
        
        {skills.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full justify-between"
            >
              <span className="text-sm font-medium">Top Skills Breakdown</span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {expanded && (
              <div className="mt-3 space-y-2">
                {skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">{skill.name}</span>
                    <Badge variant="outline" className="font-bold">
                      {skill.score}/5
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {onImprove && (
          <Button 
            onClick={onImprove}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Improve Score
          </Button>
        )}
      </CardContent>
    </Card>
  );
}