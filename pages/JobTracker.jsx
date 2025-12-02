import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase,
  Plus,
  Calendar,
  ExternalLink,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ApplicationDialog from '../components/jobs/ApplicationDialog';
import ApplicationCard from '../components/jobs/ApplicationCard';

export default function JobTracker() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['jobApplications'],
    queryFn: () => base44.entities.JobApplication.list('-application_date'),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JobApplication.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobApplications']);
      toast.success('Application deleted');
    },
  });

  const getStatusConfig = (status) => {
    const configs = {
      researching: { label: 'Researching', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Eye },
      ready_to_apply: { label: 'Ready to Apply', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
      applied: { label: 'Applied', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle },
      phone_screen: { label: 'Phone Screen', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: TrendingUp },
      first_interview: { label: '1st Interview', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: TrendingUp },
      second_interview: { label: '2nd Interview', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: TrendingUp },
      final_interview: { label: 'Final Interview', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: TrendingUp },
      offer_received: { label: 'Offer Received', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
      accepted: { label: 'Accepted', color: 'bg-green-200 text-green-800 border-green-300', icon: CheckCircle },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
      withdrawn: { label: 'Withdrawn', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: XCircle }
    };
    return configs[status] || configs.researching;
  };

  // Filter applications by status
  const filteredApplications = selectedStatus === 'all' 
    ? applications 
    : applications.filter(app => app.status === selectedStatus);

  // Group by status for tabs
  const activeApplications = applications.filter(app => 
    ['researching', 'ready_to_apply', 'applied', 'phone_screen', 'first_interview', 'second_interview', 'final_interview'].includes(app.status)
  );
  const offerApplications = applications.filter(app => app.status === 'offer_received');
  const closedApplications = applications.filter(app => ['accepted', 'rejected', 'withdrawn'].includes(app.status));

  // Statistics
  const stats = {
    total: applications.length,
    active: activeApplications.length,
    offers: offerApplications.length,
    interviews: applications.filter(app => 
      ['phone_screen', 'first_interview', 'second_interview', 'final_interview'].includes(app.status)
    ).length,
    thisWeek: applications.filter(app => {
      if (!app.application_date) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(app.application_date) >= weekAgo;
    }).length
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
            <Briefcase className="w-9 h-9" />
            Job Application Tracker
          </h1>
          <p className="text-slate-600 mt-1">
            Track and manage all your job applications in one place
          </p>
        </div>
        
        <Button 
          onClick={() => {
            setEditingApplication(null);
            setDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Application
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-600 mt-1">Total Applications</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
              <p className="text-sm text-slate-600 mt-1">Active</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.interviews}</p>
              <p className="text-sm text-slate-600 mt-1">Interviews</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">{stats.offers}</p>
              <p className="text-sm text-slate-600 mt-1">Offers</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{stats.thisWeek}</p>
              <p className="text-sm text-slate-600 mt-1">This Week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="active">
            Active ({activeApplications.length})
          </TabsTrigger>
          <TabsTrigger value="offers">
            Offers ({offerApplications.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({closedApplications.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Applications */}
        <TabsContent value="active" className="space-y-4">
          {activeApplications.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Applications</h3>
                <p className="text-slate-600 mb-6">
                  Start tracking your job search by adding your first application
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Application
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeApplications.map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onEdit={(app) => {
                    setEditingApplication(app);
                    setDialogOpen(true);
                  }}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  getStatusConfig={getStatusConfig}
                  contacts={contacts}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Offers */}
        <TabsContent value="offers" className="space-y-4">
          {offerApplications.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Offers Yet</h3>
                <p className="text-slate-600">
                  Keep applying and interviewing - your offers will show up here!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {offerApplications.map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onEdit={(app) => {
                    setEditingApplication(app);
                    setDialogOpen(true);
                  }}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  getStatusConfig={getStatusConfig}
                  contacts={contacts}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Closed Applications */}
        <TabsContent value="closed" className="space-y-4">
          {closedApplications.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <XCircle className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Closed Applications</h3>
                <p className="text-slate-600">
                  Accepted, rejected, and withdrawn applications will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {closedApplications.map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onEdit={(app) => {
                    setEditingApplication(app);
                    setDialogOpen(true);
                  }}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  getStatusConfig={getStatusConfig}
                  contacts={contacts}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={editingApplication}
        contacts={contacts}
      />
    </div>
  );
}