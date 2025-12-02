import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Lightbulb, Tag } from 'lucide-react';

export default function FeedbackSection({ 
  criticalIssues = [], 
  strengths = [], 
  suggestions = [],
  atsKeywords = []
}) {
  return (
    <div className="space-y-4">
      {/* Critical Issues */}
      {criticalIssues.length > 0 && (
        <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              Critical Issues to Fix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {criticalIssues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="font-bold text-red-600 mt-0.5">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* What's Working Well */}
      {strengths.length > 0 && (
        <Card className="border-0 shadow-lg border-l-4 border-l-emerald-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              What's Working Well
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="font-bold text-emerald-600 mt-0.5">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Specific Improvements */}
      {suggestions.length > 0 && (
        <Card className="border-0 shadow-lg border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
              <Lightbulb className="w-5 h-5" />
              Specific Improvements ({suggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {suggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-blue-600 mt-0.5 min-w-6">
                    {idx + 1}.
                  </span>
                  <span className="text-slate-700">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ATS Keywords */}
      {atsKeywords.length > 0 && (
        <Card className="border-0 shadow-lg border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
              <Tag className="w-5 h-5" />
              Important ATS Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {atsKeywords.map((item, idx) => (
                <Badge
                  key={idx}
                  className={
                    item.present
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }
                >
                  {item.present ? '✓' : '○'} {item.keyword}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-3">
              Green keywords are present in your resume. Grey keywords are missing but recommended for ATS optimization.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}