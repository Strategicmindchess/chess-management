'use client';

import { useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notifyClassStudentsAction } from '@/actions/class-reminder-actions';

interface NotifyStudentsButtonProps {
  classInstanceId: string;
  batchId?: string;
  batchName: string;
  initialReminderSentAt?: Date | string | null;
  sentByName?: string | null;
  startTime?: string;
  endTime?: string;
  isToday?: boolean;
  isCancelled?: boolean;
  isAdmin?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  onSuccess?: (timestamp: string) => void;
}

export function NotifyStudentsButton({
  classInstanceId,
  batchId,
  batchName,
  initialReminderSentAt,
  sentByName,
  startTime,
  endTime,
  isToday = true,
  isCancelled = false,
  isAdmin = false,
  className = '',
  size = 'sm',
  onSuccess,
}: NotifyStudentsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reminderSentAt, setReminderSentAt] = useState<string | null>(
    initialReminderSentAt ? new Date(initialReminderSentAt).toISOString() : null
  );

  const formattedSentTime = reminderSentAt
    ? new Date(reminderSentAt).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // 1-Hour Window check (IST)
  let isTooEarly = false;
  let opensAtStr = '';
  let isEnded = false;

  if (isToday && startTime) {
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const [startH, startM] = startTime.split(':').map(Number);
    let openH = startH - 1;
    let openM = startM;
    if (openH < 0) openH = 0;
    const openTimeStr = `${String(openH).padStart(2, '0')}:${String(openM).padStart(2, '0')}`;

    if (istTimeStr < openTimeStr) {
      isTooEarly = true;
      const dummyDate = new Date();
      dummyDate.setHours(openH, openM, 0, 0);
      opensAtStr = dummyDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    if (endTime && istTimeStr > endTime) {
      isEnded = true;
    }
  }

  const handleClick = async () => {
    // If not admin, block early click
    if (reminderSentAt || isLoading || !isToday || isCancelled || (!isAdmin && isTooEarly) || isEnded) return;

    let confirmPrompt = `Send WhatsApp class reminder to all students enrolled in "${batchName}"?`;
    if (isAdmin && isTooEarly) {
      confirmPrompt = `This class starts at ${startTime} (normal coach window opens at ${opensAtStr}). Send WhatsApp reminder now as Admin?`;
    }

    const confirmSend = window.confirm(confirmPrompt);
    if (!confirmSend) return;

    setIsLoading(true);

    try {
      const res = await notifyClassStudentsAction(classInstanceId, batchId);
      if (res.success && res.reminderSentAt) {
        setReminderSentAt(res.reminderSentAt);
        if (onSuccess) {
          onSuccess(res.reminderSentAt);
        }
      } else {
        alert(res.error || 'Failed to notify students.');
      }
    } catch (err: any) {
      console.error('Failed to notify students', err);
      alert(err?.message || 'Network error while sending notification.');
    } finally {
      setIsLoading(false);
    }
  };

  // Case 1: Cancelled Class
  if (isCancelled) {
    return null;
  }

  // Case 2: Already Notified (Strict 1-Time Guarantee)
  if (reminderSentAt) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={`bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 cursor-default font-medium opacity-95 flex items-center gap-1.5 ${className}`}
        title={`WhatsApp reminder was sent to students at ${formattedSentTime}${sentByName ? ` by ${sentByName}` : ''}`}
      >
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span>Reminded ({formattedSentTime}){sentByName ? ` · ${sentByName}` : ''}</span>
      </Button>
    );
  }

  // Case 3: Future Class (Not Today)
  if (!isToday) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={`bg-slate-800/40 text-slate-500 border border-slate-700/40 cursor-not-allowed text-xs flex items-center gap-1.5 ${className}`}
        title="Reminders can only be sent on the day of the class"
      >
        <Bell className="w-3.5 h-3.5 text-slate-500" />
        <span>Notify (Today only)</span>
      </Button>
    );
  }

  // Case 4: Class Already Ended
  if (isEnded) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={`bg-slate-800/40 text-slate-500 border border-slate-700/40 cursor-not-allowed text-xs flex items-center gap-1.5 ${className}`}
        title="This class has already ended"
      >
        <Bell className="w-3.5 h-3.5 text-slate-500" />
        <span>Class Ended</span>
      </Button>
    );
  }

  // Case 5: Too early (More than 1 hour before class starts - blocked for coaches only)
  if (isTooEarly && !isAdmin) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={`bg-slate-800/40 text-slate-400 border border-slate-700/40 cursor-not-allowed text-xs flex items-center gap-1.5 ${className}`}
        title={`Reminders open 1 hour before class (at ${opensAtStr})`}
      >
        <Bell className="w-3.5 h-3.5 text-slate-400" />
        <span>Notify (Opens {opensAtStr})</span>
      </Button>
    );
  }

  // Case 6: Ready to Notify Today (Within 1 hour of class start)
  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      size={size}
      className={`bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all flex items-center gap-1.5 ${className}`}
      title="Send WhatsApp class reminder with meet link to enrolled students"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Sending...</span>
        </>
      ) : (
        <>
          <Bell className="w-3.5 h-3.5" />
          <span>Notify Students</span>
        </>
      )}
    </Button>
  );
}
