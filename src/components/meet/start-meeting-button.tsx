'use client';

import { useState, useEffect } from 'react';
import { Video, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startMeeting, getMeetingStatus } from '@/actions/meet/meeting-actions';

interface StartMeetingButtonProps {
  classInstanceId: string;
  batchName: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StartMeetingButton({
  classInstanceId,
  batchName,
  className = '',
  size = 'sm',
}: StartMeetingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [meetingState, setMeetingState] = useState<'NOT_STARTED' | 'ACTIVE' | 'ENDED' | 'PENDING'>('NOT_STARTED');
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const res = await getMeetingStatus(classInstanceId);
        if (isMounted && res && res.exists) {
          if (res.status === 'ACTIVE') {
            setMeetingState('ACTIVE');
            if (res.meetingUrl) setActiveUrl(res.meetingUrl);
          } else if (res.status === 'ENDED') {
            setMeetingState('ENDED');
          } else if (res.status === 'PENDING') {
            setMeetingState('PENDING');
          }
        }
      } catch (err) {
        console.error('Failed to check meeting status:', err);
      }
    }
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [classInstanceId]);

  const handleClick = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await startMeeting(classInstanceId);
      if (result.success && result.meetingUrl) {
        setMeetingState('ACTIVE');
        setActiveUrl(result.meetingUrl);
        window.open(result.meetingUrl, '_blank');
      } else {
        setErrorMessage(result.error || 'Failed to start meeting room');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error starting meeting');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <Button
        onClick={handleClick}
        disabled={isLoading || meetingState === 'ENDED'}
        className={`w-full font-semibold transition-all shadow-sm ${
          meetingState === 'ACTIVE'
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-brand-600 hover:bg-brand-700 text-white'
        } ${className}`}
        size={size}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            Connecting...
          </>
        ) : meetingState === 'ACTIVE' ? (
          <>
            <Video className="w-4 h-4 mr-1.5" />
            Rejoin Meeting
          </>
        ) : meetingState === 'ENDED' ? (
          <>
            <Video className="w-4 h-4 mr-1.5 opacity-50" />
            Class Ended
          </>
        ) : (
          <>
            <Video className="w-4 h-4 mr-1.5" />
            Start Meeting
          </>
        )}
      </Button>

      {errorMessage && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {errorMessage}
        </p>
      )}
    </div>
  );
}
