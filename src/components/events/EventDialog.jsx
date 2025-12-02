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
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function EventDialog({ open, onOpenChange, event, contacts }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    is_virtual: false,
    virtual_link: '',
    type: 'networking',
    description: '',
    contacts_attending: [],
    follow_up_required: false,
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        date: event.date || '',
        time: event.time || '',
        location: event.location || '',
        is_virtual: event.is_virtual || false,
        virtual_link: event.virtual_link || '',
        type: event.type || 'networking',
        description: event.description || '',
        contacts_attending: event.contacts_attending || [],
        follow_up_required: event.follow_up_required || false,
      });
    } else {
      setFormData({
        title: '',
        date: '',
        time: '',
        location: '',
        is_virtual: false,
        virtual_link: '',
        type: 'networking',
        description: '',
        contacts_attending: [],
        follow_up_required: false,
      });
    }
  }, [event, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (event) {
        return base44.entities.Event.update(event.id, data);
      } else {
        return base44.entities.Event.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      toast.success(event ? 'Event updated!' : 'Event created!');
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Add New Event'}</DialogTitle>
          <DialogDescription>
            Track networking events, conferences, and meetups
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Event Title *</Label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Tech Conference 2025"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                required
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select 
                value={formData.type}
                onValueChange={(value) => setFormData({...formData, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="meetup">Meetup</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="networking">Networking</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Location</Label>
                <div className="flex items-center space-x-2">
                    <Checkbox 
                        id="is_virtual" 
                        checked={formData.is_virtual}
                        onCheckedChange={(checked) => setFormData({...formData, is_virtual: checked})}
                    />
                    <label htmlFor="is_virtual" className="text-xs font-medium cursor-pointer">
                        Virtual Event
                    </label>
                </div>
              </div>
              {formData.is_virtual ? (
                  <Input
                    value={formData.virtual_link}
                    onChange={(e) => setFormData({...formData, virtual_link: e.target.value})}
                    placeholder="https://zoom.us/..."
                  />
              ) : (
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Venue or City"
                  />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Event details, what to bring, goals..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="follow_up"
              checked={formData.follow_up_required}
              onCheckedChange={(checked) => setFormData({...formData, follow_up_required: checked})}
            />
            <label
              htmlFor="follow_up"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Follow-up required after event
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}