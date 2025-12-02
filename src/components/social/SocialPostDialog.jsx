import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function SocialPostDialog({ open, onOpenChange, post }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    scheduled_date: '',
    platform: 'linkedin',
    status: 'draft',
    topic: '',
    engagement_goal: '',
  });

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || '',
        content: post.content || '',
        scheduled_date: post.scheduled_date || '',
        platform: post.platform || 'linkedin',
        status: post.status || 'draft',
        topic: post.topic || '',
        engagement_goal: post.engagement_goal || '',
      });
    } else {
      setFormData({
        title: '',
        content: '',
        scheduled_date: '',
        platform: 'linkedin',
        status: 'draft',
        topic: '',
        engagement_goal: '',
      });
    }
  }, [post, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (post) {
        return base44.entities.SocialPost.update(post.id, data);
      } else {
        return base44.entities.SocialPost.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['socialPosts']);
      toast.success(post ? 'Post updated!' : 'Post created!');
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const wordCount = formData.content.split(/\s+/).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? 'Edit Post' : 'Create New Post'}</DialogTitle>
          <DialogDescription>
            Plan your LinkedIn content to stay visible
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Post Title *</Label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Short headline for your post"
            />
          </div>

          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="Write your post content here..."
              rows={8}
            />
            <p className="text-xs text-slate-500 text-right">
              {wordCount} words
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select 
                value={formData.platform}
                onValueChange={(value) => setFormData({...formData, platform: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.status === 'scheduled' && (
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Topic/Theme</Label>
            <Input
              value={formData.topic}
              onChange={(e) => setFormData({...formData, topic: e.target.value})}
              placeholder="e.g., Career Growth, Industry Trends"
            />
          </div>

          <div className="space-y-2">
            <Label>Engagement Goal</Label>
            <Input
              value={formData.engagement_goal}
              onChange={(e) => setFormData({...formData, engagement_goal: e.target.value})}
              placeholder="What do you want to achieve?"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : post ? 'Update Post' : 'Create Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}