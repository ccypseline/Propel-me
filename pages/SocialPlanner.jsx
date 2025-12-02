import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Newspaper,
  Plus,
  Calendar,
  Sparkles,
  CheckCircle,
  Clock,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import SocialPostDialog from '../components/social/SocialPostDialog';

export default function SocialPlanner() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);

  const { data: posts = [] } = useQuery({
    queryKey: ['socialPosts'],
    queryFn: () => base44.entities.SocialPost.list('-scheduled_date'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.SocialPost.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['socialPosts']);
      toast.success('Post status updated!');
    },
  });

  const generateIdeas = async () => {
    setGeneratingIdeas(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 5 engaging LinkedIn post ideas for a professional building their network. 
        
        Include diverse topics:
        - Career insights and lessons learned
        - Industry trends and observations
        - Professional development tips
        - Networking and relationship building
        - Personal brand and thought leadership
        
        For each idea, provide:
        - A catchy title
        - Main topic/theme
        - Key points to cover
        - Target engagement goal
        
        Return as JSON with this structure:
        {
          "ideas": [
            {
              "title": "post title",
              "topic": "main topic",
              "points": ["point 1", "point 2", "point 3"],
              "engagement_goal": "what you want to achieve"
            }
          ]
        }`,
        response_json_schema: {
          type: "object",
          properties: {
            ideas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  topic: { type: "string" },
                  points: { type: "array", items: { type: "string" } },
                  engagement_goal: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.ideas) {
        for (const idea of result.ideas) {
          await base44.entities.SocialPost.create({
            title: idea.title,
            content: `Topic: ${idea.topic}\n\nKey Points:\n${idea.points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
            platform: 'linkedin',
            status: 'draft',
            topic: idea.topic,
            engagement_goal: idea.engagement_goal
          });
        }
        queryClient.invalidateQueries(['socialPosts']);
        toast.success('Generated 5 post ideas! ✨');
      }
    } catch (error) {
      toast.error('Error generating ideas');
      console.error(error);
    }
    setGeneratingIdeas(false);
  };

  const draftPosts = posts.filter(p => p.status === 'draft');
  const scheduledPosts = posts.filter(p => p.status === 'scheduled');
  const publishedPosts = posts.filter(p => p.status === 'published');

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
            <Newspaper className="w-9 h-9" />
            Social Content Planner
          </h1>
          <p className="text-slate-600 mt-1">
            Plan and schedule your LinkedIn presence
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={generateIdeas}
            disabled={generatingIdeas}
            variant="outline"
            className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
          >
            {generatingIdeas ? (
              <>Generating...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Ideas
              </>
            )}
          </Button>
          <Button 
            onClick={() => {
              setEditingPost(null);
              setDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Draft Posts</p>
                <p className="text-3xl font-bold text-slate-900">{draftPosts.length}</p>
              </div>
              <Edit className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Scheduled</p>
                <p className="text-3xl font-bold text-blue-600">{scheduledPosts.length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Published</p>
                <p className="text-3xl font-bold text-emerald-600">{publishedPosts.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Draft Posts */}
      {draftPosts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Drafts</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {draftPosts.map(post => (
              <Card key={post.id} className="border-0 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg mb-2">{post.title}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline">{post.platform}</Badge>
                        <Badge className="bg-slate-100 text-slate-700">Draft</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600 line-clamp-3">{post.content}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPost(post);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: post.id, status: 'scheduled' })}
                    >
                      Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Posts */}
      {scheduledPosts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Scheduled</h2>
          <div className="space-y-3">
            {scheduledPosts.map(post => (
              <Card key={post.id} className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-slate-600">
                          {post.scheduled_date ? format(new Date(post.scheduled_date), 'MMM d, yyyy') : 'Not scheduled'}
                        </span>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">Scheduled</Badge>
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-1">{post.title}</h3>
                      <p className="text-sm text-slate-600 line-clamp-2">{post.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPost(post);
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: post.id, status: 'published' })}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Mark Published
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {posts.length === 0 && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-purple-50">
          <CardContent className="p-12 text-center">
            <Newspaper className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Start Your Content Calendar</h3>
            <p className="text-slate-600 mb-6">
              Stay visible on LinkedIn with consistent, valuable content
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={generateIdeas} variant="outline">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Ideas
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <SocialPostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        post={editingPost}
      />
    </div>
  );
}