import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  PenTool,
  Plus,
  Sparkles,
  FileText,
  Loader2,
  Copy,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function BlogWriter() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    keywords: '',
    target_platform: 'linkedin',
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: () => base44.entities.BlogPost.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BlogPost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['blogPosts']);
      setShowForm(false);
      setFormData({ title: '', topic: '', keywords: '', target_platform: 'linkedin' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BlogPost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['blogPosts']);
    },
  });

  const generateContent = async (post) => {
    setGenerating(true);
    try {
      const keywords = post.keywords?.join(', ') || '';
      const prompt = `Write a professional blog post for ${post.target_platform || 'LinkedIn'}.

Title: ${post.title}
Topic: ${post.topic}
${keywords ? `Keywords to include: ${keywords}` : ''}

Requirements:
- Professional yet conversational tone
- 600-800 words
- Include an engaging hook
- Use clear section headings
- Provide actionable insights
- End with a thought-provoking conclusion
- Format in Markdown
- Make it valuable for career professionals

Write the complete blog post:`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt
      });

      const wordCount = result.split(/\s+/).filter(Boolean).length;

      await base44.entities.BlogPost.update(post.id, {
        content: result,
        word_count: wordCount,
        status: 'draft'
      });

      queryClient.invalidateQueries(['blogPosts']);
      toast.success('Blog post generated! ✨');
    } catch (error) {
      toast.error('Error generating content');
      console.error(error);
    }
    setGenerating(false);
  };

  const handleCreateIdea = () => {
    if (!formData.title || !formData.topic) {
      toast.error('Please fill in title and topic');
      return;
    }

    const keywordsArray = formData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    createMutation.mutate({
      title: formData.title,
      topic: formData.topic,
      keywords: keywordsArray,
      target_platform: formData.target_platform,
      status: 'idea',
      word_count: 0
    });
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const ideaPosts = posts.filter(p => p.status === 'idea');
  const draftPosts = posts.filter(p => p.status === 'draft');
  const publishedPosts = posts.filter(p => p.status === 'published');

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
            <PenTool className="w-9 h-9" />
            Blog Writer
          </h1>
          <p className="text-slate-600 mt-1">
            AI-powered long-form content creation
          </p>
        </div>
        
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Blog Idea
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Create Blog Idea</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Your blog post title"
                />
              </div>

              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input
                  value={formData.topic}
                  onChange={(e) => setFormData({...formData, topic: e.target.value})}
                  placeholder="Main topic or theme"
                />
              </div>

              <div className="space-y-2">
                <Label>Keywords (comma-separated)</Label>
                <Input
                  value={formData.keywords}
                  onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                  placeholder="AI, technology, career"
                />
              </div>

              <div className="space-y-2">
                <Label>Target Platform</Label>
                <Input
                  value={formData.target_platform}
                  onChange={(e) => setFormData({...formData, target_platform: e.target.value})}
                  placeholder="LinkedIn, Medium, etc."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateIdea} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Idea'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ideas */}
      {ideaPosts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Ideas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideaPosts.map(post => (
              <Card key={post.id} className="border-0 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg mb-2">{post.title}</CardTitle>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">Idea</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <p><strong>Topic:</strong> {post.topic}</p>
                    {post.keywords && post.keywords.length > 0 && (
                      <p><strong>Keywords:</strong> {post.keywords.join(', ')}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => generateContent(post)}
                    disabled={generating}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Content
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Drafts */}
      {draftPosts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Drafts</h2>
          {draftPosts.map(post => (
            <Card key={post.id} className="border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">{post.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        Draft
                      </Badge>
                      <Badge variant="outline">
                        {post.word_count} words
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(post.content, post.id)}
                    >
                      {copiedId === post.id ? (
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
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: post.id, data: { status: 'published' } })}
                    >
                      Mark Published
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none">
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {posts.length === 0 && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-purple-50">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Start Writing</h3>
            <p className="text-slate-600 mb-6">
              Create professional blog content with AI assistance
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Blog Idea
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}