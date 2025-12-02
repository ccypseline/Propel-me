import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  FileText,
  Upload,
  Sparkles,
  Download,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  FileCheck,
  AlignLeft,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Resume() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState([]);
  const [formData, setFormData] = useState({
    version_name: '',
    target_role: '',
    target_industry: '',
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => base44.entities.Resume.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Resume.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['resumes']);
      toast.success('Resume deleted successfully');
    },
    onError: (error) => {
      toast.error('Error deleting resume');
      console.error(error);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!formData.version_name) {
      toast.error('Please enter a version name first');
      return;
    }

    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (fileExtension !== '.pdf') {
      toast.error('Please upload a PDF file only');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.Resume.create({
        version_name: formData.version_name,
        file_url,
        target_role: formData.target_role,
        target_industry: formData.target_industry,
        status: 'draft',
        optimization_score: 0,
        suggestions: []
      });

      queryClient.invalidateQueries(['resumes']);
      toast.success('Resume uploaded!');
      
      setFormData({
        version_name: '',
        target_role: '',
        target_industry: '',
      });
    } catch (error) {
      toast.error('Error uploading resume');
      console.error(error);
    }
    setUploading(false);
  };

  const analyzeResume = async (resume) => {
    console.log('Starting analysis for resume:', resume);
    setAnalyzingIds(prev => [...prev, resume.id]);
    
    try {
      toast.info('📄 Reading your resume...', { duration: 3000 });
      
      const extractionSchema = {
        type: "object",
        properties: {
          full_text: { type: "string", description: "All text content from the resume" },
          sections_found: {
            type: "array",
            items: { type: "string" },
            description: "List of sections like Summary, Experience, Education, Skills"
          }
        },
        required: ["full_text"]
      };

      console.log('Extracting content from:', resume.file_url);
      const extractedContent = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: resume.file_url,
        json_schema: extractionSchema
      });

      console.log('Extraction result:', extractedContent);

      if (extractedContent.status === 'error' || !extractedContent.output?.full_text) {
        throw new Error('Failed to read resume content. Please ensure your file is a valid PDF.');
      }

      toast.info('🤖 AI is analyzing your resume...', { duration: 5000 });

      const analysisPrompt = `You are an expert resume reviewer, ATS specialist, and career coach with 15+ years of experience.

RESUME CONTENT TO ANALYZE:
${extractedContent.output.full_text}

TARGET ROLE: ${resume.target_role || 'General professional position'}
TARGET INDUSTRY: ${resume.target_industry || 'Any industry'}

Provide a COMPREHENSIVE analysis with specific, actionable recommendations:

1. **Overall ATS Score (0-100)**: Calculate based on:
   - ATS compatibility & keyword usage (30%)
   - Content quality & impact (30%)
   - Format & structure (20%)
   - Quantifiable achievements (20%)

2. **Specific Improvements (12-15 items)**: Be EXTREMELY SPECIFIC with exact locations and rewrites:
   - Point to EXACT bullets/sections with problems
   - Provide EXACT rewrite suggestions with better phrasing
   - Include missing quantifiable metrics with examples
   - Identify weak action verbs and suggest stronger alternatives
   - Flag formatting issues (bullets too long, inconsistent dates, etc)
   - Suggest missing sections (Skills, Certifications, Projects, etc)
   - Highlight vague statements that need specifics
   - Check for grammatical issues or typos

3. **Strengths (3-4 items)**: What the resume does well

4. **Critical Issues (2-4 items)**: MUST-FIX problems that will hurt ATS ranking or hiring manager impression

5. **ATS Keywords (8-12 keywords)**: Essential keywords for ${resume.target_role || 'this role'} in ${resume.target_industry || 'this industry'}

Be brutally honest but constructive. Make every suggestion immediately actionable.`;

      console.log('Calling LLM for analysis...');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            score: { 
              type: "number",
              description: "Overall score from 0-100"
            },
            suggestions: {
              type: "array",
              items: { type: "string" },
              description: "12-15 specific, actionable improvements with exact locations"
            },
            strengths: {
              type: "array",
              items: { type: "string" },
              description: "3-4 things the resume does well"
            },
            critical_issues: {
              type: "array",
              items: { type: "string" },
              description: "2-4 critical problems that must be fixed"
            },
            ats_keywords: {
              type: "array",
              items: { type: "string" },
              description: "8-12 important keywords for the target role"
            }
          },
          required: ["score", "suggestions", "strengths", "critical_issues", "ats_keywords"]
        }
      });

      console.log('Analysis result:', result);

      if (!result || !result.suggestions || !result.strengths || !result.critical_issues || !result.ats_keywords) {
        throw new Error('Analysis incomplete - please try again');
      }

      console.log('Updating resume with results...');
      await base44.entities.Resume.update(resume.id, {
        optimization_score: result.score,
        suggestions: result.suggestions,
        strengths: result.strengths,
        critical_issues: result.critical_issues,
        ats_keywords: result.ats_keywords,
        status: 'ready'
      });

      queryClient.invalidateQueries(['resumes']);
      
      const scoreEmoji = result.score >= 80 ? '🟢' : result.score >= 60 ? '🟡' : '🔴';
      toast.success(`${scoreEmoji} Analysis Complete!`, { 
        description: `Score: ${result.score}/100 • ${result.suggestions.length} improvements found`,
        duration: 5000 
      });
      
    } catch (error) {
      console.error('Resume analysis error:', error);
      toast.error('Analysis Failed', {
        description: error.message || 'Please try again or contact support if the issue persists',
        duration: 5000
      });
    } finally {
      setAnalyzingIds(prev => prev.filter(id => id !== resume.id));
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (score >= 60) return { label: 'Good', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Needs Work', color: 'bg-red-100 text-red-700 border-red-200' };
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
          <FileText className="w-9 h-9" />
          Resume Optimizer
        </h1>
        <p className="text-slate-600 mt-1">
          AI-powered resume analysis with specific, actionable improvements
        </p>
      </div>

      {/* Upload Card */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New Resume
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ PDF files only - Please convert Word documents to PDF before uploading
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Version Name *</Label>
              <Input
                value={formData.version_name}
                onChange={(e) => setFormData({...formData, version_name: e.target.value})}
                placeholder="e.g., Software Engineer v2"
              />
            </div>

            <div className="space-y-2">
              <Label>Target Role</Label>
              <Input
                value={formData.target_role}
                onChange={(e) => setFormData({...formData, target_role: e.target.value})}
                placeholder="e.g., Senior Product Manager"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Target Industry</Label>
              <Input
                value={formData.target_industry}
                onChange={(e) => setFormData({...formData, target_industry: e.target.value})}
                placeholder="e.g., Technology, Finance, Healthcare"
              />
            </div>
          </div>

          <label>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading || !formData.version_name}
            />
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              uploading || !formData.version_name
                ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                : 'border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-50'
            }`}>
              {uploading ? (
                <Loader2 className="w-12 h-12 mx-auto mb-3 text-blue-600 animate-spin" />
              ) : (
                <Upload className="w-12 h-12 mx-auto mb-3 text-blue-600" />
              )}
              <p className="font-medium text-slate-900 mb-1">
                {uploading ? 'Uploading...' : 'Click to upload PDF resume'}
              </p>
              <p className="text-sm text-slate-500">
                PDF format only (Max 10MB)
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Resume List */}
      {resumes.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Resumes Yet</h3>
            <p className="text-slate-600">
              Upload your PDF resume to get AI-powered optimization suggestions
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Your Resumes</h2>
          
          {resumes.map(resume => {
            const scoreBadge = resume.optimization_score ? getScoreBadge(resume.optimization_score) : null;
            const isAnalyzing = analyzingIds.includes(resume.id);
            
            return (
              <Card key={resume.id} className="border-0 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-6">
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-xl font-bold text-slate-900">{resume.version_name}</h3>
                          {resume.optimization_score > 0 && scoreBadge && (
                            <Badge className={`border ${scoreBadge.color}`}>
                              {scoreBadge.label}
                            </Badge>
                          )}
                        </div>
                        {resume.target_role && (
                          <p className="text-sm text-slate-600">
                            Target: {resume.target_role} {resume.target_industry && `in ${resume.target_industry}`}
                          </p>
                        )}
                      </div>

                      {resume.optimization_score > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-600">Optimization Score</span>
                            <span className={`text-2xl font-bold ${getScoreColor(resume.optimization_score)}`}>
                              {resume.optimization_score}/100
                            </span>
                          </div>
                          <ProgressBar value={resume.optimization_score} className="h-3" />
                        </div>
                      )}

                      {/* Critical Issues */}
                      {resume.critical_issues && resume.critical_issues.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                          <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Critical Issues to Fix ({resume.critical_issues.length})
                          </h4>
                          <ul className="space-y-2">
                            {resume.critical_issues.map((issue, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-red-800">
                                <span className="font-bold mt-0.5">•</span>
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Strengths */}
                      {resume.strengths && resume.strengths.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                          <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            What's Working Well ({resume.strengths.length})
                          </h4>
                          <ul className="space-y-2">
                            {resume.strengths.map((strength, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-emerald-800">
                                <span className="font-bold mt-0.5">✓</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Suggestions */}
                      {resume.suggestions && resume.suggestions.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Specific Improvements ({resume.suggestions.length})
                          </h4>
                          <ul className="space-y-3">
                            {resume.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-blue-900">
                                <span className="font-bold text-blue-600 mt-0.5">{idx + 1}.</span>
                                <span className="flex-1">{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* ATS Keywords */}
                      {resume.ats_keywords && resume.ats_keywords.length > 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Important ATS Keywords ({resume.ats_keywords.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {resume.ats_keywords.map((item, idx) => {
                              const keywordText = typeof item === 'string' ? item : item.keyword;
                              const isPresent = typeof item === 'object' ? item.present : true;
                              return (
                                <Badge 
                                  key={idx} 
                                  className={isPresent 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                    : 'bg-slate-100 text-slate-600 border-slate-300'
                                  }
                                >
                                  {isPresent ? '✓' : '○'} {keywordText}
                                </Badge>
                              );
                            })}
                          </div>
                          <p className="text-xs text-purple-700 mt-3">
                            Green keywords are present. Grey keywords are missing but recommended.
                          </p>
                        </div>
                      )}

                      <div className="flex gap-3 flex-wrap">
                        <Button
                          onClick={() => window.location.href = createPageUrl('ResumeReview') + '?id=' + resume.id}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <FileCheck className="w-4 h-4 mr-2" />
                          {resume.overall_score ? 'View Analysis' : 'Analyze Resume'}
                        </Button>

                        <Button variant="outline" asChild>
                          <a href={resume.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="border-red-300 text-red-700 hover:bg-red-50"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{resume.version_name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(resume.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}