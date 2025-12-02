import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, addHours } from 'date-fns';

export default function AddToCalendar({ event, variant = "outline", size = "sm", className }) {
  const { title, description, location, date, time } = event;

  const getStartDateTime = () => {
    if (!date) return new Date();
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const timeStr = time || '09:00';
    return new Date(`${dateStr}T${timeStr}:00`);
  };

  const start = getStartDateTime();
  const end = addHours(start, 1); // Default 1 hour duration

  const formatDateForUrl = (date) => {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title || 'Event')}&dates=${formatDateForUrl(start)}/${formatDateForUrl(end)}&details=${encodeURIComponent(description || '')}&location=${encodeURIComponent(location || '')}`;

  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${start.toISOString()}&enddt=${end.toISOString()}&subject=${encodeURIComponent(title || 'Event')}&body=${encodeURIComponent(description || '')}&location=${encodeURIComponent(location || '')}`;

  const downloadIcs = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDateForUrl(start)}`,
      `DTEND:${formatDateForUrl(end)}`,
      `SUMMARY:${title || 'Event'}`,
      `DESCRIPTION:${description || ''}`,
      `LOCATION:${location || ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${title || 'event'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <CalendarIcon className="w-4 h-4 mr-2" />
          Add to Calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => window.open(googleUrl, '_blank')}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(outlookUrl, '_blank')}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Outlook.com
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadIcs}>
          <Download className="w-4 h-4 mr-2" />
          Download .ics (Apple/Outlook)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}