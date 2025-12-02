import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ApplicationDialog({ open, onOpenChange, application, contacts }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    company: '',
    job_role: '',
    contact_id: '',
    contact_name: '',
    hiring_manager: '',
    hiring_manager_linkedin: '',
    job_posting_url: '',
    application_date: '',
    status: 'researching',
    keywords: [],
    job_description: '',
    message_sent: '',
    follow_up_date: '',
    salary_range: '',
    location: '',
    notes: '',
    resume_used: ''
  });

  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    if (application) {
      setFormData({
        company: application.company || '',
        job_role: application.job_role || '',
        contact_id: application.contact_id || '',
        contact_name: application.contact_name || '',
        hiring_manager: application.hiring_manager || '',
        hiring_manager_linkedin: application.hiring_manager_linkedin || '',
        job_posting_url: application.job_posting_url || '',
        application_date: application.application_date || '',
        status: application.status || 'researching',
        keywords: application.keywords || [],
        job_description: application.job_description || '',
        message_sent: application.message_sent || '',
        follow_up_date: application.follow_up_date || '',
        salary_range: application.salary_range || '',
        location: application.location || '',
        notes: application.notes || '',
        resume_used: application.resume_used || ''
      });
      setKeywordInput((application.keywords || []).join(', '));
    } else {
      setFormData({
        company: '',
        job_role: '',
        contact_id: '',
        contact_name: '',
        hiring_manager: '',
        hiring_manager_linkedin: '',
        job_posting_url: '',
        application_date: new Date().toISOString().split('T')[0],
        status: 'researching',
        keywords: [],
        job_description: '',
        message_sent: '',
        follow_up_date: '',
        salary_range: '',
        location: '',
        notes: '',
        resume_used: ''
      });
      setKeywordInput('');
    }
  }, [application, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (application) {
        return base44.entities.JobApplication.update(application.id, data);
      } else {
        return base44.entities.JobApplication.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobApplications']);
      onOpenChange(false);
      toast.success(application ? 'Application updated!' : 'Application added!');
    },
    onError: (error) => {
      toast.error('Error saving application');
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Parse keywords from comma-separated string
    const keywords = keywordInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    saveMutation.mutate({
      ...formData,
      keywords
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {application ? 'Edit Application' : 'Add New Application'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
                placeholder="e.g., Google"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Job Role *</Label>
              <Input
                value={formData.job_role}
                onChange={(e) => setFormData({...formData, job_role: e.target.value})}
                placeholder="e.g., Senior Product Manager"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Application Date</Label>
              <Input
                type="date"
                value={formData.application_date}
                onChange={(e) => setFormData({...formData, application_date: e.target.value})}
              />
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
                  <SelectItem value="researching">Researching</SelectItem>
                  <SelectItem value="ready_to_apply">Ready to Apply</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="phone_screen">Phone Screen</SelectItem>
                  <SelectItem value="first_interview">First Interview</SelectItem>
                  <SelectItem value="second_interview">Second Interview</SelectItem>
                  <SelectItem value="final_interview">Final Interview</SelectItem>
                  <SelectItem value="offer_received">Offer Received</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="e.g., Remote, San Francisco, CA"
              />
            </div>

            <div className="space-y-2">
              <Label>Salary Range</Label>
              <Input
                value={formData.salary_range}
                onChange={(e) => setFormData({...formData, salary_range: e.target.value})}
                placeholder="e.g., $100k-$120k"
              />
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Job Posting URL</Label>
              <Input
                type="url"
                value={formData.job_posting_url}
                onChange={(e) => setFormData({...formData, job_posting_url: e.target.value})}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact/Referral</Label>
              <Select
                value={formData.contact_id}
                onValueChange={(value) => setFormData({...formData, contact_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No contact</SelectItem>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} - {contact.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Or Enter Contact Name</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                placeholder="Contact name"
              />
            </div>

            <div className="space-y-2">
              <Label>Hiring Manager</Label>
              <Input
                value={formData.hiring_manager}
                onChange={(e) => setFormData({...formData, hiring_manager: e.target.value})}
                placeholder="Hiring manager name"
              />
            </div>

            <div className="space-y-2">
              <Label>Hiring Manager LinkedIn</Label>
              <Input
                type="url"
                value={formData.hiring_manager_linkedin}
                onChange={(e) => setFormData({...formData, hiring_manager_linkedin: e.target.value})}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>Keywords from Job Description</Label>
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="e.g., Python, Machine Learning, Agile (comma separated)"
            />
            <p className="text-xs text-slate-500">Separate multiple keywords with commas</p>
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            <Label>Job Description / Key Requirements</Label>
            <Textarea
              value={formData.job_description}
              onChange={(e) => setFormData({...formData, job_description: e.target.value})}
              placeholder="Paste the job description or key requirements..."
              rows={6}
            />
          </div>

          {/* Message Sent */}
          <div className="space-y-2">
            <Label>Message Sent to Hiring Manager/Referral</Label>
            <Textarea
              value={formData.message_sent}
              onChange={(e) => setFormData({...formData, message_sent: e.target.value})}
              placeholder="Copy of your outreach message..."
              rows={6}
            />
          </div>

          {/* Additional Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Resume Used</Label>
              <Input
                value={formData.resume_used}
                onChange={(e) => setFormData({...formData, resume_used: e.target.value})}
                placeholder="e.g., PM Resume v3"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes about this application..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                application ? 'Update Application' : 'Add Application'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}