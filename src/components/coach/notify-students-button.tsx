'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  Loader2, 
  Users, 
  Clock, 
  Video, 
  AlertCircle, 
  CheckCircle2, 
  Send,
  MessageSquare,
  CheckSquare,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { notifyClassStudentsAction, getClassStudentsForModalAction } from '@/actions/class-reminder-actions';

export interface StudentRecipientItem {
  id: string;
  name: string;
  phone?: string;
}

interface NotifyStudentsButtonProps {
  classInstanceId: string;
  batchId?: string;
  batchName: string;
  batchCode?: string;
  meetLink?: string;
  students?: StudentRecipientItem[];
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
  batchCode,
  meetLink,
  students = [],
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
  const [modalOpen, setModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Local student list with auto-fetch fallback
  const [studentList, setStudentList] = useState<StudentRecipientItem[]>(students);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Set of selected student IDs — ALL students checked/ticked by default!
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    () => new Set(students.map((s) => s.id))
  );

  const [reminderSentAt, setReminderSentAt] = useState<string | null>(
    initialReminderSentAt ? new Date(initialReminderSentAt).toISOString() : null
  );

  // Sync state if initialReminderSentAt changes from parent/server refresh
  useEffect(() => {
    setReminderSentAt(initialReminderSentAt ? new Date(initialReminderSentAt).toISOString() : null);
  }, [initialReminderSentAt]);

  useEffect(() => {
    if (students && students.length > 0) {
      setStudentList(students);
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  }, [students]);

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

  // Toggle individual student
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle Select All
  const areAllSelected = studentList.length > 0 && selectedStudentIds.size === studentList.length;
  const toggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(studentList.map((s) => s.id)));
    }
  };

  const openDialog = async () => {
    setSendSuccessMessage(null);
    setErrorMessage(null);
    setSendProgress(0);
    setModalOpen(true);

    if (studentList.length === 0) {
      setLoadingStudents(true);
      try {
        const fetched = await getClassStudentsForModalAction(classInstanceId, batchId);
        if (fetched && fetched.length > 0) {
          const mapped: StudentRecipientItem[] = fetched.map((s) => ({
            id: s.id,
            name: s.name,
            phone: s.phone || '',
          }));
          setStudentList(mapped);
          setSelectedStudentIds(new Set(mapped.map((s) => s.id)));
        }
      } catch (err: any) {
        console.error('[NotifyStudentsButton] Failed to fetch students:', err);
      } finally {
        setLoadingStudents(false);
      }
    } else {
      setSelectedStudentIds(new Set(studentList.map((s) => s.id)));
    }
  };

  const handleSendNotification = async () => {
    if (isSending || selectedStudentIds.size === 0) return;
    setIsSending(true);
    setErrorMessage(null);
    setSendProgress(20);

    const progressTimer = setInterval(() => {
      setSendProgress((p) => (p < 85 ? p + 25 : p));
    }, 200);

    try {
      const res = await notifyClassStudentsAction(
        classInstanceId,
        batchId,
        Array.from(selectedStudentIds)
      );
      clearInterval(progressTimer);
      setSendProgress(100);

      if (res.success && res.reminderSentAt) {
        setReminderSentAt(res.reminderSentAt);
        const count = selectedStudentIds.size;
        setSendSuccessMessage(`✔ WhatsApp reminder successfully sent to ${count} student(s)!`);
        if (onSuccess) {
          onSuccess(res.reminderSentAt);
        }
      } else {
        setErrorMessage(res.error || 'Failed to send notification.');
      }
    } catch (err: any) {
      clearInterval(progressTimer);
      console.error('Failed to dispatch notification', err);
      setErrorMessage(err?.message || 'Network error while sending notification.');
    } finally {
      setIsSending(false);
    }
  };

  // If class is cancelled, do not render button
  if (isCancelled) {
    return null;
  }

  // Reminded state: locked for coaches, but Admin can click to resend anytime!
  if (reminderSentAt && !isAdmin) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={`bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 cursor-default font-medium text-sm px-4 h-10 rounded-lg opacity-95 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${className}`}
        title={`WhatsApp reminder was sent at ${formattedSentTime}${sentByName ? ` by ${sentByName}` : ''}`}
      >
        <Check className="w-4 h-4 text-emerald-400" />
        <span>Reminded</span>
      </Button>
    );
  }

  const disabledState = !isToday || isEnded || (isTooEarly && !isAdmin);

  return (
    <>
      {/* Trigger Button on Class Card */}
      <Button
        onClick={openDialog}
        size={size}
        className={`font-medium text-sm px-4 h-10 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
          reminderSentAt
            ? 'bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]'
            : disabledState && !isAdmin
            ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border border-slate-700/60 shadow-none cursor-pointer'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)] cursor-pointer'
        } ${className}`}
        title={
          reminderSentAt
            ? `Sent at ${formattedSentTime}. Click to Resend.`
            : isEnded
            ? 'This class has ended'
            : isTooEarly
            ? `Reminders open at ${opensAtStr} (click to view students)`
            : 'Send WhatsApp class reminder to students'
        }
      >
        {reminderSentAt ? (
          <>
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Reminded (Resend)</span>
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            <span>Notify Students</span>
          </>
        )}
      </Button>

      {/* Pop Up Modal: Teacher can see whether all students are ticked or not */}
      <Dialog
        open={modalOpen}
        onClose={() => !isSending && setModalOpen(false)}
        title="Notify Students via WhatsApp"
        description={`Send instant class reminder and Google Meet link to enrolled students.`}
        className="max-w-xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl"
      >
        <div className="space-y-4 pt-1">
          {/* Class Overview Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400 font-medium">Class Session</p>
              <h4 className="text-white font-bold text-sm mt-0.5 flex items-center gap-2">
                <span>{batchName}</span>
                {batchCode && (
                  <Badge variant="neutral" className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0 border-none">
                    {batchCode}
                  </Badge>
                )}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
                <span className="flex items-center gap-1 font-medium text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  {startTime} – {endTime}
                </span>
                {meetLink && (
                  <>
                    <span className="text-slate-600">•</span>
                    <a
                      href={meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Video className="w-3 h-3" /> Meet Link
                    </a>
                  </>
                )}
              </div>
            </div>
            <Badge
              variant="neutral"
              className="self-start sm:self-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 flex items-center gap-1"
            >
              <Bell className="w-3 h-3" />
              <span>WhatsApp Alert</span>
            </Badge>
          </div>

          {/* Students Checklist: Teacher can see that all students are ticked */}
          <div>
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  disabled={loadingStudents || studentList.length === 0}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer select-none"
                >
                  <Checkbox
                    checked={areAllSelected}
                    onChange={toggleSelectAll}
                    id="select-all-students"
                    disabled={loadingStudents || studentList.length === 0}
                  />
                  <span>
                    {areAllSelected ? 'All Students Selected' : 'Select All Students'} ({selectedStudentIds.size}/{studentList.length})
                  </span>
                </button>
              </div>

              <div>
                {loadingStudents ? (
                  <Badge variant="neutral" className="bg-slate-800 text-slate-400 border border-slate-700 text-[11px] px-2 py-0.5 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" /> Loading...
                  </Badge>
                ) : areAllSelected && studentList.length > 0 ? (
                  <Badge variant="neutral" className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2 py-0.5 flex items-center gap-1">
                    <Check className="w-3 h-3" /> All Ticked
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] px-2 py-0.5">
                    {selectedStudentIds.size} of {studentList.length} Ticked
                  </Badge>
                )}
              </div>
            </div>

            {/* Scrollable Checklist */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl max-h-52 overflow-y-auto p-2 space-y-1.5">
              {loadingStudents ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs">Fetching enrolled students...</span>
                </div>
              ) : studentList.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  No students currently enrolled in this batch.
                </div>
              ) : (
                studentList.map((student) => {
                  const isChecked = selectedStudentIds.has(student.id);
                  const hasPhone = Boolean(student.phone && student.phone.trim().length >= 10);

                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'bg-slate-900 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.08)]'
                          : 'bg-slate-950/60 border-slate-800/80 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleStudent(student.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <div className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
                            <span>{student.name}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {hasPhone ? `📞 ${student.phone}` : '⚠️ Phone not registered'}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isChecked ? (
                          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" /> Ticked
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            Unticked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Template Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-brand-400" />
                WhatsApp Message Preview
              </label>
              <span className="text-[10px] text-slate-500">smc_class_reminder</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
              {`Reminder: Your class for batch "${batchName}" is scheduled today at ${startTime}.
Join Link: ${meetLink || 'https://meet.google.com/...'}`}
            </div>
          </div>

          {/* Progress Bar when sending */}
          {(isSending || sendProgress > 0) && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-blue-400 font-medium">
                <span>Sending WhatsApp Messages...</span>
                <span>{sendProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  style={{ width: `${sendProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Early notice banner if 1-hour window applies */}
          {isTooEarly && !isAdmin && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-200">1-Hour Window Policy</p>
                <p className="text-amber-300/90 mt-0.5">
                  Class reminders open 1 hour before class starts (available at <strong>{opensAtStr}</strong>).
                </p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {sendSuccessMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-medium">{sendSuccessMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-xs text-slate-400">
              {selectedStudentIds.size} of {studentList.length} recipient(s) selected
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                disabled={isSending}
                className="text-slate-400 hover:text-white text-xs h-9 px-3"
              >
                {sendSuccessMessage ? 'Close' : 'Cancel'}
              </Button>

              {!sendSuccessMessage && (
                <Button
                  type="button"
                  onClick={handleSendNotification}
                  disabled={
                    isSending ||
                    selectedStudentIds.size === 0 ||
                    (isTooEarly && !isAdmin)
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Notification ({selectedStudentIds.size})</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
