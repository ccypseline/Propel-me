import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { calculateWarmthScore, calculateRelevanceScore, calculateOverallPriority } from '../utils/scoringUtils';

export default function AddContactDialog({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    linkedin_url: '',
    phone: '',
    current_company: '',
    current_title: '',
    location: '',
    notes: '',
    how_met: '',
    last_interaction_date: new Date().toISOString().split('T')[0],
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    
    const hasContactMethod = formData.email.trim() || formData.linkedin_url.trim() || formData.phone.trim();
    if (!hasContactMethod) {
      newErrors.contact_method = 'At least one contact method (email, LinkedIn, or phone) is required';
    }
    
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (formData.linkedin_url.trim() && !/^https?:\/\/.+/.test(formData.linkedin_url)) {
      newErrors.linkedin_url = 'Invalid URL format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);

    try {
      // Check for duplicate email or LinkedIn URL
      const existingContacts = await base44.entities.Contact.list();
      const duplicate = existingContacts.find(c => 
        (formData.email && c.email === formData.email) ||
        (formData.linkedin_url && c.profile_url === formData.linkedin_url)
      );

      if (duplicate) {
        const confirmed = window.confirm(
          `A contact with this ${formData.email && c.email === formData.email ? 'email' : 'LinkedIn URL'} already exists (${duplicate.full_name}). Do you want to continue anyway?`
        );
        if (!confirmed) {
          setSaving(false);
          return;
        }
      }

      // Get user career profile for relevance scoring
      const careerProfiles = await base44.entities.UserCareerProfile.list();
      const careerProfile = careerProfiles[0];

      // Calculate scores
      const warmth = calculateWarmthScore(formData.last_interaction_date);
      const relevance = calculateRelevanceScore({
        current_company: formData.current_company,
        current_title: formData.current_title,
        location: formData.location,
        industry: ''
      }, careerProfile);
      const priority = calculateOverallPriority(relevance.score, warmth.score);

      // Create contact
      const newContact = await base44.entities.Contact.create({
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: `${formData.first_name} ${formData.last_name}`,
        email: formData.email,
        profile_url: formData.linkedin_url,
        current_company: formData.current_company,
        current_title: formData.current_title,
        location: formData.location,
        connected_on: formData.last_interaction_date,
        last_interaction_date: formData.last_interaction_date,
        notes: formData.notes,
        tags: formData.tags,
        warmth_score: warmth.score,
        warmth_bucket: warmth.bucket,
        relevance_score: relevance.score,
        relevance_bucket: relevance.bucket,
        overall_priority_score: priority.score,
        overall_priority_bucket: priority.bucket,
        total_interactions: 1
      });

      // Create initial interaction
      await base44.entities.Interaction.create({
        contact_id: newContact.id,
        interaction_type: formData.how_met || 'other',
        date: formData.last_interaction_date,
        notes: formData.notes,
        xp_earned: 10,
        completed: true
      });

      toast.success('Contact added successfully!');
      setOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        linkedin_url: '',
        phone: '',
        current_company: '',
        current_title: '',
        location: '',
        notes: '',
        how_met: '',
        last_interaction_date: new Date().toISOString().split('T')[0],
        tags: []
      });
      setErrors({});
      onSuccess?.();
      
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Failed to add contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="w-5 h-5" />
            Add New Contact
          </DialogTitle>
          <DialogDescription>
            Add a contact you met at an event, via email, or through other channels
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className={errors.first_name ? 'border-red-500' : ''}
              />
              {errors.first_name && <p className="text-xs text-red-600">{errors.first_name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className={errors.last_name ? 'border-red-500' : ''}
              />
              {errors.last_name && <p className="text-xs text-red-600">{errors.last_name}</p>}
            </div>
          </div>

          {/* Contact Methods */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-900">Contact Methods (at least one required) *</p>
            {errors.contact_method && <p className="text-xs text-red-600">{errors.contact_method}</p>}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
              <Input
                id="linkedin_url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className={errors.linkedin_url ? 'border-red-500' : ''}
              />
              {errors.linkedin_url && <p className="text-xs text-red-600">{errors.linkedin_url}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {/* Professional Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_company">Company / Organization</Label>
              <Input
                id="current_company"
                value={formData.current_company}
                onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="current_title">Job Title / Role</Label>
              <Input
                id="current_title"
                value={formData.current_title}
                onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Boston, MA"
            />
          </div>

          {/* Relationship Info */}
          <div className="space-y-2">
            <Label htmlFor="how_met">How did you meet?</Label>
            <Input
              id="how_met"
              value={formData.how_met}
              onChange={(e) => setFormData({ ...formData, how_met: e.target.value })}
              placeholder="e.g., HIMSS conference, mutual friend introduction"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_interaction_date">Last Interaction Date</Label>
            <Input
              id="last_interaction_date"
              type="date"
              value={formData.last_interaction_date}
              onChange={(e) => setFormData({ ...formData, last_interaction_date: e.target.value })}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="e.g., Hult, VC, Healthtech"
              />
              <Button type="button" onClick={handleAddTag} variant="outline">Add</Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional context about this contact..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Contact
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}