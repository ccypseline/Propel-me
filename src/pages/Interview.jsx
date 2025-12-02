import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress as ProgressBar } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MessageSquare,
  Sparkles,
  Play,
  CheckCircle,
  TrendingUp,
  Clock,
  Loader2,
  RotateCcw,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Interview() {
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [evaluatingAnswer, setEvaluatingAnswer] = useState(false);
  const [startConfig, setStartConfig] = useState({
    resume_id: '',
    target_role: '',
    interview_type: 'mixed',
    total_questions: 5
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => base44.entities.Resume.list('-created_date'),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['interviewSessions'],
    queryFn: () => base44.entities.InterviewSession.list('-created_date'),
  });

  const startInterview = async () => {
    if (!startConfig.target_role) {
      toast.error('Please enter a target role');
      return;
    }

    setGeneratingQuestion(true);
    try {
      const selectedResume = resumes.find(r => r.id === startConfig.resume_id);
      
      // Create session
      const session = await base44.entities.InterviewSession.create({
        resume_id: startConfig.resume_id || null,
        target_role: startConfig.target_role,
        interview_type: startConfig.interview_type,
        total_questions: startConfig.total_questions,
        status: 'in_progress',
        current_question_index: 0,
        questions: []
      });

      // Generate first question
      const prompt = `You are conducting a ${startConfig.interview_type} interview for a ${startConfig.target_role} position.
${selectedResume ? `The candidate's resume shows: ${selectedResume.target_role || 'various experience'} in ${selectedResume.target_industry || 'their field'}.` : ''}

Generate the first interview question. Make it:
- Relevant to the ${startConfig.target_role} role
- ${startConfig.interview_type === 'behavioral' ? 'A behavioral question using the STAR method' : ''}
${startConfig.interview_type === 'technical' ? 'A technical question testing their knowledge' : ''}
${startConfig.interview_type === 'mixed' ? 'Either behavioral or technical, varying throughout the interview' : ''}

Return JSON:
{
  "question": "Tell me about a time when...",
  "context": "This question assesses..."
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: selectedResume?.file_url ? [selectedResume.file_url] : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            question: { type: "string" },
            context: { type: "string" }
          }
        }
      });

      const updatedSession = await base44.entities.InterviewSession.update(session.id, {
        questions: [{
          question: result.question,
          answer: '',
          score: null,
          feedback: ''
        }]
      });

      setActiveSession(updatedSession);
      queryClient.invalidateQueries(['interviewSessions']);
      toast.success('Interview started! Good luck! 🎯');
    } catch (error) {
      toast.error('Error starting interview');
      console.error(error);
    }
    setGeneratingQuestion(false);
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) {
      toast.error('Please provide an answer');
      return;
    }

    setEvaluatingAnswer(true);
    try {
      const currentQuestion = activeSession.questions[activeSession.current_question_index];
      
      // Evaluate the answer
      const prompt = `You are evaluating an interview answer for a ${activeSession.target_role} position.

Question: ${currentQuestion.question}

Candidate's Answer: ${currentAnswer}

Evaluate this answer and provide:
1. A score from 0-100
2. Constructive feedback on what was good and what could be improved
3. Specific suggestions for a stronger answer

Return JSON:
{
  "score": 75,
  "feedback": "Good start... Here's what you did well... Areas for improvement...",
  "key_strengths": ["point 1", "point 2"],
  "areas_to_improve": ["point 1", "point 2"]
}`;

      const evaluation = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            feedback: { type: "string" },
            key_strengths: {
              type: "array",
              items: { type: "string" }
            },
            areas_to_improve: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      // Update the current question with answer and evaluation
      const updatedQuestions = [...activeSession.questions];
      updatedQuestions[activeSession.current_question_index] = {
        ...currentQuestion,
        answer: currentAnswer,
        score: evaluation.score,
        feedback: evaluation.feedback,
        key_strengths: evaluation.key_strengths,
        areas_to_improve: evaluation.areas_to_improve
      };

      const nextIndex = activeSession.current_question_index + 1;
      const isComplete = nextIndex >= activeSession.total_questions;

      if (isComplete) {
        // Complete the interview
        const avgScore = updatedQuestions.reduce((sum, q) => sum + (q.score || 0), 0) / updatedQuestions.length;
        
        const finalPrompt = `Based on this interview performance for a ${activeSession.target_role} position, provide overall feedback:

Questions and Scores:
${updatedQuestions.map((q, i) => `Q${i + 1}: ${q.question}\nScore: ${q.score}/100`).join('\n\n')}

Provide comprehensive feedback including:
- Overall strengths
- Key areas for improvement
- Specific advice for future interviews
- Confidence level recommendation

Return as a detailed paragraph.`;

        const overallFeedback = await base44.integrations.Core.InvokeLLM({
          prompt: finalPrompt
        });

        await base44.entities.InterviewSession.update(activeSession.id, {
          questions: updatedQuestions,
          current_question_index: nextIndex,
          status: 'completed',
          overall_score: Math.round(avgScore),
          overall_feedback: overallFeedback
        });

        const completedSession = await base44.entities.InterviewSession.list();
        const updated = completedSession.find(s => s.id === activeSession.id);
        setActiveSession(updated);
        toast.success(`Interview completed! Overall score: ${Math.round(avgScore)}/100 🎉`);
      } else {
        // Generate next question
        const nextQuestionPrompt = `You are conducting a ${activeSession.interview_type} interview for a ${activeSession.target_role} position.

This is question ${nextIndex + 1} of ${activeSession.total_questions}.

Previous questions asked:
${updatedQuestions.map(q => `- ${q.question}`).join('\n')}

Generate the next interview question. Make it different from previous questions and progressively more challenging.

Return JSON:
{
  "question": "...",
  "context": "This question assesses..."
}`;

        const nextQuestion = await base44.integrations.Core.InvokeLLM({
          prompt: nextQuestionPrompt,
          response_json_schema: {
            type: "object",
            properties: {
              question: { type: "string" },
              context: { type: "string" }
            }
          }
        });

        updatedQuestions.push({
          question: nextQuestion.question,
          answer: '',
          score: null,
          feedback: ''
        });

        await base44.entities.InterviewSession.update(activeSession.id, {
          questions: updatedQuestions,
          current_question_index: nextIndex
        });

        const sessions = await base44.entities.InterviewSession.list();
        const updated = sessions.find(s => s.id === activeSession.id);
        setActiveSession(updated);
        setCurrentAnswer('');
        toast.success('Answer submitted! Next question loaded.');
      }

      queryClient.invalidateQueries(['interviewSessions']);
    } catch (error) {
      toast.error('Error evaluating answer');
      console.error(error);
    }
    setEvaluatingAnswer(false);
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

  if (activeSession && activeSession.status === 'in_progress') {
    const currentQuestion = activeSession.questions[activeSession.current_question_index];
    const progress = ((activeSession.current_question_index + 1) / activeSession.total_questions) * 100;

    return (
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Interview in Progress</h1>
            <p className="text-slate-600 mt-1">{activeSession.target_role} - {activeSession.interview_type}</p>
          </div>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            Question {activeSession.current_question_index + 1} of {activeSession.total_questions}
          </Badge>
        </div>

        <ProgressBar value={progress} className="h-2" />

        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Interview Question</h3>
                <p className="text-lg text-slate-700 leading-relaxed">
                  {currentQuestion.question}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-2 block">Your Answer</span>
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here... Be specific and provide examples."
                  rows={8}
                  className="text-base"
                  disabled={evaluatingAnswer}
                />
              </label>
              <p className="text-sm text-slate-500">
                Tip: Use the STAR method (Situation, Task, Action, Result) for behavioral questions
              </p>
              <Button
                onClick={submitAnswer}
                disabled={evaluatingAnswer || !currentAnswer.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {evaluatingAnswer ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Evaluating your answer...
                  </>
                ) : (
                  <>
                    Submit Answer
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Previous Q&A */}
        {activeSession.current_question_index > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Previous Questions</h3>
            {activeSession.questions.slice(0, activeSession.current_question_index).map((q, idx) => (
              <Card key={idx} className="border-0 shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-slate-900">Q{idx + 1}: {q.question}</h4>
                    {q.score && (
                      <Badge className={`border ${getScoreBadge(q.score).color}`}>
                        {q.score}/100
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    <span className="font-medium">Your answer:</span> {q.answer}
                  </p>
                  {q.feedback && (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                      {q.feedback}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeSession && activeSession.status === 'completed') {
    const scoreBadge = getScoreBadge(activeSession.overall_score);

    return (
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-600" />
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Interview Complete!</h1>
          <p className="text-slate-600">Great job completing the interview</p>
        </div>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-blue-50">
          <CardContent className="p-8 text-center">
            <p className="text-sm font-medium text-slate-600 mb-2">Overall Score</p>
            <p className={`text-6xl font-bold ${getScoreColor(activeSession.overall_score)} mb-3`}>
              {activeSession.overall_score}/100
            </p>
            <Badge className={`border text-base px-4 py-1 ${scoreBadge.color}`}>
              {scoreBadge.label}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Overall Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
              {activeSession.overall_feedback}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900">Question Breakdown</h3>
          {activeSession.questions.map((q, idx) => (
            <Card key={idx} className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-bold text-slate-900 flex-1">Q{idx + 1}: {q.question}</h4>
                  <Badge className={`border ml-4 ${getScoreBadge(q.score).color}`}>
                    {q.score}/100
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Your Answer:</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                      {q.answer}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-2">Feedback:</p>
                    <p className="text-sm text-slate-700 mb-3">{q.feedback}</p>
                    
                    {q.key_strengths && q.key_strengths.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-emerald-700 mb-1">✓ Strengths:</p>
                        <ul className="text-sm text-slate-700 space-y-1">
                          {q.key_strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span>•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {q.areas_to_improve && q.areas_to_improve.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-amber-700 mb-1">→ Areas to Improve:</p>
                        <ul className="text-sm text-slate-700 space-y-1">
                          {q.areas_to_improve.map((a, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span>•</span>
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => {
              setActiveSession(null);
              setCurrentAnswer('');
            }}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start New Interview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
          <MessageSquare className="w-9 h-9" />
          AI Interview Practice
        </h1>
        <p className="text-slate-600 mt-1">
          Practice interviews with AI feedback to improve your performance
        </p>
      </div>

      {/* Start New Interview */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Start New Interview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Resume (Optional)
              </label>
              <Select
                value={startConfig.resume_id}
                onValueChange={(value) => setStartConfig({...startConfig, resume_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a resume..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No resume (generic interview)</SelectItem>
                  {resumes.map(resume => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.version_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Target Role *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Senior Product Manager"
                value={startConfig.target_role}
                onChange={(e) => setStartConfig({...startConfig, target_role: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Interview Type
              </label>
              <Select
                value={startConfig.interview_type}
                onValueChange={(value) => setStartConfig({...startConfig, interview_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="behavioral">Behavioral (STAR method)</SelectItem>
                  <SelectItem value="technical">Technical Questions</SelectItem>
                  <SelectItem value="mixed">Mixed (Recommended)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Number of Questions
              </label>
              <Select
                value={startConfig.total_questions.toString()}
                onValueChange={(value) => setStartConfig({...startConfig, total_questions: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Questions (Quick)</SelectItem>
                  <SelectItem value="5">5 Questions (Standard)</SelectItem>
                  <SelectItem value="7">7 Questions (Comprehensive)</SelectItem>
                  <SelectItem value="10">10 Questions (Full Interview)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={startInterview}
            disabled={generatingQuestion || !startConfig.target_role}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {generatingQuestion ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Preparing your interview...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start Interview
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Past Sessions */}
      {sessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Past Interview Sessions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {sessions.map(session => (
              <Card
                key={session.id}
                className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setActiveSession(session)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{session.target_role}</h3>
                      <p className="text-sm text-slate-600">
                        {session.interview_type} • {session.total_questions} questions
                      </p>
                    </div>
                    {session.status === 'completed' && session.overall_score && (
                      <Badge className={`border ${getScoreBadge(session.overall_score).color}`}>
                        {session.overall_score}/100
                      </Badge>
                    )}
                    {session.status === 'in_progress' && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        In Progress
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    {format(new Date(session.created_date), 'MMM d, yyyy')}
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