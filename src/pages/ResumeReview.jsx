import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Download, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import PDFViewer from '../components/resume/PDFViewer';
import ScoreCard from '../components/resume/ScoreCard';
import SoftSkillsCard from '../components/resume/SoftSkillsCard';
import DiagnosticsSection from '../components/resume/DiagnosticsSection';
import FeedbackSection from '../components/resume/FeedbackSection';

export default function ResumeReview() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const resumeId = new URLSearchParams(location.search).get('id');
  const [analyzing, setAnalyzing] = useState(false);

  const { data: resume, isLoading } = useQuery({
    queryKey: ['resume', resumeId],
    queryFn: async () => {
      const resumes = await base44.entities.Resume.list();
      return resumes.find(r => r.id === resumeId);
    },
    enabled: !!resumeId,
  });

  const analyzeResume = async () => {
    setAnalyzing(true);
    try {
      toast.info('📄 Extracting resume content...', { duration: 3000 });
      
      const extractionSchema = {
        type: "object",
        properties: {
          full_text: { type: "string" },
          positions: { type: "array", items: { type: "string" } },
          bullets: { type: "array", items: { type: "string" } }
        },
        required: ["full_text"]
      };

      const extractedContent = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: resume.file_url,
        json_schema: extractionSchema
      });

      if (extractedContent.status === 'error' || !extractedContent.output?.full_text) {
        throw new Error('Failed to read resume content');
      }

      toast.info('🤖 AI is analyzing your resume with validation...', { duration: 5000 });

      const analysisPrompt = `You are an expert resume analyst. Analyze this resume comprehensively:

RESUME TEXT:
${extractedContent.output.full_text}

TARGET ROLE: ${resume.target_role || 'General professional position'}
TARGET INDUSTRY: ${resume.target_industry || 'Any industry'}

Provide a structured analysis with:

1. OVERALL SCORE (0-100): Based on format, content quality, ATS compatibility, and impact

2. SOFT SKILLS ASSESSMENT:
   - Overall rating: "Strong", "Average", or "Needs Improvement"
   - Top 5-7 soft skills with scores 1-5 (e.g., Leadership, Problem Solving, Strategic Thinking, Communication, Collaboration, Adaptability, Innovation)

3. DIAGNOSTICS:
   a) Overall Length:
      - Count positions, bullets, total words
      - Score 0-100 with messages about length appropriateness
   
   b) Consistency:
      - Check header capitalization, date formats, bullet point formatting
      - Score 0-100 with specific consistency issues or confirmations
   
   c) Bullets Quality:
      - Calculate % starting with action verbs
      - Calculate % with quantified outcomes (numbers, %, $, etc.)
      - Score 0-100 with messages
   
   d) Bullet Balance:
      - Average bullets per position
      - Average characters per bullet
      - Average words per bullet
      - Score 0-100 with balance assessment

4. CRITICAL ISSUES (0-3 items): Only REAL problems that will significantly hurt the resume. Be selective.

5. STRENGTHS (2-4 items): What's genuinely working well

6. SPECIFIC IMPROVEMENTS (8-12 items): Detailed, actionable suggestions with examples

7. ATS KEYWORDS: List 8-12 important keywords for the target role/industry, mark each as present:true or present:false based on the resume text

IMPORTANT VALIDATION RULES:
- If 50%+ of bullets have numbers/metrics, DO NOT claim "lack of quantification"
- If target industry keywords appear multiple times, DO NOT claim "missing keywords"
- If headers are consistent, DO NOT flag formatting issues
- Be accurate and evidence-based in your critical issues`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            soft_skills_score: { type: "string", enum: ["Strong", "Average", "Needs Improvement"] },
            soft_skills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  score: { type: "number" }
                }
              }
            },
            diagnostics: {
              type: "object",
              properties: {
                overall_length: {
                  type: "object",
                  properties: {
                    score: { type: "number" },
                    positions: { type: "number" },
                    bullets: { type: "number" },
                    total_words: { type: "number" },
                    messages: { type: "array", items: { type: "string" } }
                  }
                },
                consistency: {
                  type: "object",
                  properties: {
                    score: { type: "number" },
                    messages: { type: "array", items: { type: "string" } }
                  }
                },
                bullets_quality: {
                  type: "object",
                  properties: {
                    score: { type: "number" },
                    action_verbs_pct: { type: "number" },
                    quantified_pct: { type: "number" },
                    messages: { type: "array", items: { type: "string" } }
                  }
                },
                bullet_balance: {
                  type: "object",
                  properties: {
                    score: { type: "number" },
                    avg_bullets_per_position: { type: "number" },
                    avg_chars_per_bullet: { type: "number" },
                    avg_words_per_bullet: { type: "number" },
                    messages: { type: "array", items: { type: "string" } }
                  }
                }
              }
            },
            critical_issues: { type: "array", items: { type: "string" } },
            strengths: { type: "array", items: { type: "string" } },
            suggestions: { type: "array", items: { type: "string" } },
            ats_keywords: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  keyword: { type: "string" },
                  present: { type: "boolean" }
                }
              }
            }
          },
          required: ["overall_score", "soft_skills_score", "soft_skills", "diagnostics", "critical_issues", "strengths", "suggestions", "ats_keywords"]
        }
      });

      await base44.entities.Resume.update(resume.id, {
        overall_score: result.overall_score,
        soft_skills_score: result.soft_skills_score,
        soft_skills: result.soft_skills,
        diagnostics: result.diagnostics,
        critical_issues: result.critical_issues,
        strengths: result.strengths,
        suggestions: result.suggestions,
        ats_keywords: result.ats_keywords,
        status: 'ready'
      });

      queryClient.invalidateQueries(['resume', resumeId]);
      toast.success('✅ Analysis complete!');
      
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!resume) {
    return (
      <div className="p-8">
        <p className="text-slate-600">Resume not found</p>
        <Link to={createPageUrl('Resume')}>
          <Button className="mt-4">Back to Resumes</Button>
        </Link>
      </div>
    );
  }

  const needsAnalysis = !resume.overall_score || resume.status !== 'ready';

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Resume')}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {resume.version_name}
            </h1>
            {resume.target_role && (
              <p className="text-sm text-slate-600">
                {resume.target_role} {resume.target_industry && `• ${resume.target_industry}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={analyzeResume}
            disabled={analyzing}
            variant={needsAnalysis ? 'default' : 'outline'}
            className={needsAnalysis ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {needsAnalysis ? 'Analyze Resume' : 'Refresh Analysis'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="flex-1 overflow-hidden grid md:grid-cols-2 gap-6 p-6">
        {/* Left: PDF Viewer */}
        <div className="h-full">
          <PDFViewer fileUrl={resume.file_url} />
        </div>

        {/* Right: Scores & Feedback */}
        <div className="h-full overflow-auto space-y-4 pr-2">
          {needsAnalysis ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
              <p className="text-amber-900 font-medium mb-3">
                Click "Analyze Resume" to get detailed feedback and scores
              </p>
            </div>
          ) : (
            <>
              <ScoreCard
                title="Overall Score"
                score={resume.overall_score || 0}
                description="This score reflects the format, length, and overall quality of your resume."
              />

              <SoftSkillsCard
                score={resume.soft_skills_score}
                skills={resume.soft_skills || []}
              />

              <DiagnosticsSection diagnostics={resume.diagnostics} />

              <FeedbackSection
                criticalIssues={resume.critical_issues || []}
                strengths={resume.strengths || []}
                suggestions={resume.suggestions || []}
                atsKeywords={resume.ats_keywords || []}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}