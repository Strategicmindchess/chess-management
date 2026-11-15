'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { joinMeeting } from '@/actions/meet/meeting-actions';

interface JoinMeetingButtonProps {
  classInstanceId: string;
  instanceDate: Date | string;
  startTime: string; // "10:00"
  endTime: string;   // "11:00"
  fallbackMeetLink?: string;
  className?: string;
}

export function JoinMeetingButton({
  classInstanceId,
  instanceDate,
  startTime,
  endTime,
  fallbackMeetLink,
  className = '',
}: JoinMeetingButtonProps) {
  const [isActive, setIsActive] = useState(false);
  const [reason, setReason] = useState<string | null>('Checking schedule...');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const targetDate = new Date(instanceDate);
      const isToday = now.toDateString() === targetDate.toDateString();

      if (!isToday) {
        setIsActive(false);
        setReason('Class is not today');
        return;
      }

      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const classStart = new Date(now);
      classStart.setHours(startH, startM, 0, 0);

      const classEnd = new Date(now);
      classEnd.setHours(endH, endM, 0, 0);

      // Allow joining 10 minutes before start
      const joinWindowStart = new Date(classStart.getTime() - 10 * 60 * 1000);

      if (now < joinWindowStart) {
        setIsActive(false);
        setReason("Class hasn't started yet");
      } else if (now > classEnd) {
        setIsActive(false);
        setReason('Class has ended');
      } else {
        setIsActive(true);
        setReason(null);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 30000);
    return () => clearInterval(interval);
  }, [instanceDate, startTime, endTime]);

  const handleJoinClick = async () => {
    if (!isActive || isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await joinMeeting(classInstanceId);
      if (result.success && result.meetingUrl) {
        window.open(result.meetingUrl, '_blank');
      } else {
        setErrorMessage(result.error || 'Failed to enter class');
        // If fallback link exists, open it anyway to avoid stranding student
        if (fallbackMeetLink) {
          window.open(fallbackMeetLink, '_blank');
        }
      }
    } catch (err) {
      setErrorMessage('Connection error. Trying fallback link...');
      if (fallbackMeetLink) {
        window.open(fallbackMeetLink, '_blank');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isActive) {
    return (
      <span
        title={reason || 'Cannot join'}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 px-3 py-1.5 rounded-md cursor-not-allowed transition-colors"
      >
        Join Class <ExternalLink className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleJoinClick}
        disabled={isLoading}
        className={`inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-400 dark:hover:bg-brand-900/60 px-3 py-1.5 rounded-md transition-all cursor-pointer shadow-sm active:scale-95 ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            Join Class <ExternalLink className="h-3.5 w-3.5" />
          </>
        )}
      </button>

      {errorMessage && (
        <span className="text-[11px] text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {errorMessage}
        </span>
      )}
    </div>
  );
}

