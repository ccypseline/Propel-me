import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  ExternalLink,
  User,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
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

export default function ApplicationCard({ application, onEdit, onDelete, getStatusConfig, contacts }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = getStatusConfig(application.status);
  const StatusIcon = statusConfig.icon;
  
  const contact = contacts.find(c => c.id === application.contact_id);

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {application.job_role}
              </h3>
              <p className="text-slate-600 font-medium">{application.company}</p>
            </div>
            <Badge className={`border ${statusConfig.color}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Quick Info */}
          <div className="space-y-2 text-sm text-slate-600">
            {application.application_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Applied: {format(new Date(application.application_date), 'MMM d, yyyy')}
              </div>
            )}
            {application.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {application.location}
              </div>
            )}
            {application.salary_range && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {application.salary_range}
              </div>
            )}
            {(application.contact_name || contact) && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Contact: {contact ? `${contact.first_name} ${contact.last_name}` : application.contact_name}
              </div>
            )}
          </div>

          {/* Keywords */}
          {application.keywords && application.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {application.keywords.slice(0, 3).map((keyword, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {application.keywords.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{application.keywords.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Expandable Details */}
          {expanded && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              {application.job_description && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Job Description
                  </p>
                  <p className="text-sm text-slate-600 whitespace-pre-line line-clamp-4">
                    {application.job_description}
                  </p>
                </div>
              )}

              {application.hiring_manager && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    Hiring Manager
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-600">{application.hiring_manager}</p>
                    {application.hiring_manager_linkedin && (
                      <a
                        href={application.hiring_manager_linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {application.message_sent && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Message Sent
                  </p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-line">
                    {application.message_sent}
                  </p>
                </div>
              )}

              {application.follow_up_date && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    Next Follow-up
                  </p>
                  <p className="text-sm text-slate-600">
                    {format(new Date(application.follow_up_date), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {application.resume_used && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    Resume Used
                  </p>
                  <p className="text-sm text-slate-600">{application.resume_used}</p>
                </div>
              )}

              {application.notes && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Notes</p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">
                    {application.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="flex-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show More
                </>
              )}
            </Button>
            
            {application.job_posting_url && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={application.job_posting_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(application)}
            >
              <Edit className="w-4 h-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Application?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the application for {application.job_role} at {application.company}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(application.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}