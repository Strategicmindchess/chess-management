'use client';

import { useEffect, useState } from 'react';
import { getMeetingStatus, MeetingStatusResponse } from '@/actions/meet/meeting-actions';
import { Badge } from '@/components/ui/badge';
import { Radio, ExternalLink } from 'lucide-react';

interface MeetingStatusBadgeProps {
  classInstanceId: string;
}

export function MeetingStatusBadge({ classInstanceId }: MeetingStatusBadgeProps) {
  const [status, setStatus] = useState<MeetingStatusResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    getMeetingStatus(classInstanceId)
      .then((data) => {
        if (mounted) setStatus(data);
      })
      .catch((err) => console.error(err));
    return () => {
      mounted = false;
    };
  }, [classInstanceId]);

  if (!status || !status.exists) {
    return (
      <Badge variant="neutral" className="bg-slate-100 text-slate-600 text-xs font-normal">
        Not Started
      </Badge>
    );
  }

  if (status.status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 animate-pulse">
        <Radio className="w-3 h-3 animate-ping text-emerald-600" />
        Meeting Live
        {status.meetingUrl && (
          <a
            href={status.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-1 hover:underline inline-flex items-center"
          >
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </span>
    );
  }

  if (status.status === 'ENDED') {
    return (
      <Badge variant="neutral" className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 text-xs">
        Ended
      </Badge>
    );
  }

  if (status.status === 'PENDING') {
    return (
      <Badge variant="warning" className="bg-amber-100 text-amber-800 text-xs">
        Initializing...
      </Badge>
    );
  }

  return null;
}

