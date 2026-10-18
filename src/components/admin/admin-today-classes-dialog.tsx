'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  Check, 
  Clock, 
  Search, 
  RefreshCw, 
  User, 
  Users, 
  Video, 
  Calendar,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { NotifyStudentsButton } from '@/components/coach/notify-students-button';
import { getAdminTodayClassesAction, AdminTodayClassItem } from '@/actions/class-reminder-actions';

interface AdminTodayClassesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AdminTodayClassesDialog({ open, onClose }: AdminTodayClassesDialogProps) {
  const [classes, setClasses] = useState<AdminTodayClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'REMINDED'>('ALL');
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminTodayClassesAction();
      setClasses(data);
    } catch (err: any) {
      console.error('Failed to load today classes for admin', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchClasses();
    }
  }, [open]);

  // Toggle student expansion
  const toggleStudentList = (instanceId: string) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [instanceId]: !prev[instanceId],
    }));
  };

  // Callback when reminder is successfully sent
  const handleReminderSuccess = (instanceId: string, timestamp: string) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === instanceId
          ? {
              ...c,
              reminderSentAt: timestamp,
              reminderSentByName: 'Admin',
            }
          : c
      )
    );
  };

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      // Filter by status tab
      if (statusFilter === 'PENDING' && c.reminderSentAt) return false;
      if (statusFilter === 'REMINDED' && !c.reminderSentAt) return false;

      // Filter by search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchBatch = c.batchName.toLowerCase().includes(q) || c.batchCode.toLowerCase().includes(q);
      const matchCoach = c.coachName.toLowerCase().includes(q);
      const matchStudent = c.students.some((s) => s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q)));
      return matchBatch || matchCoach || matchStudent;
    });
  }, [classes, searchQuery, statusFilter]);

  // Statistics
  const totalClasses = classes.length;
  const remindedCount = classes.filter((c) => Boolean(c.reminderSentAt)).length;
  const pendingCount = totalClasses - remindedCount;
  const totalStudents = classes.reduce((acc, curr) => acc + curr.studentCount, 0);

  // Today formatted in IST
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Today's Scheduled Classes & WhatsApp Notifications"
      description={`Academy-wide live view for ${todayFormatted}. Check coach reminder status and dispatch 1-time notifications.`}
      className="max-w-5xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl"
    >
      <div className="space-y-4 pt-2">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Today</span>
            <div className="text-2xl font-bold text-white mt-0.5">{totalClasses}</div>
            <span className="text-[10px] text-slate-500">Scheduled sessions</span>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">Reminders Sent</span>
            <div className="text-2xl font-bold text-emerald-400 mt-0.5">{remindedCount}</div>
            <span className="text-[10px] text-emerald-500/80">Already notified</span>
          </div>
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-amber-400">Pending</span>
            <div className="text-2xl font-bold text-amber-400 mt-0.5">{pendingCount}</div>
            <span className="text-[10px] text-amber-500/80">Not notified yet</span>
          </div>
          <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-lg p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-indigo-400">Total Students</span>
            <div className="text-2xl font-bold text-indigo-300 mt-0.5">{totalStudents}</div>
            <span className="text-[10px] text-indigo-400/80">Enrolled in today's classes</span>
          </div>
        </div>

        {/* Search, Filter & Refresh Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search batch, code, coach, or student name..."
              className="pl-9 bg-slate-950/70 border-slate-700/60 text-sm text-slate-200 placeholder:text-slate-500 h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  statusFilter === 'ALL' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({totalClasses})
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  statusFilter === 'PENDING' ? 'bg-amber-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('REMINDED')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  statusFilter === 'REMINDED' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reminded ({remindedCount})
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchClasses}
              disabled={isLoading}
              className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 h-9 px-3 gap-1.5"
              title="Refresh today's live classes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Classes List */}
        <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
          {isLoading && classes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
              <p className="text-sm">Fetching today's class instances across the academy...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
              <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-medium text-slate-300">No classes found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No classes match your current search or status filters.'
                  : 'No class instances are scheduled for today in the academy calendar.'}
              </p>
            </div>
          ) : (
            filteredClasses.map((item) => {
              const isReminded = Boolean(item.reminderSentAt);
              const isExpanded = Boolean(expandedStudents[item.id]);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isReminded
                      ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                      : 'bg-slate-900/80 border-slate-700/80 hover:border-indigo-500/50 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Timing, Batch & Coach */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Time Badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">
                          <Clock className="w-3 h-3" />
                          {item.startTime} - {item.endTime} IST
                        </span>

                        {/* Status Badge */}
                        <Badge
                          variant={item.status === 'COMPLETED' ? 'success' : item.status === 'CANCELLED' ? 'danger' : 'neutral'}
                          className="text-[10px]"
                        >
                          {item.status}
                        </Badge>

                        {/* Batch Type */}
                        {item.batchType && (
                          <span className="text-[10px] text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/40">
                            {item.batchType.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>

                      {/* Batch Name & Code */}
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base text-white truncate">{item.batchName}</h3>
                        <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                          {item.batchCode}
                        </span>
                      </div>

                      {/* Coach & Google Meet Info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-200">{item.coachName}</span>
                          {item.coachPhone && (
                            <span className="text-slate-400 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" />
                              {item.coachPhone}
                            </span>
                          )}
                        </div>

                        {item.meetLink && (
                          <a
                            href={item.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                            title="Open Google Meet Link"
                          >
                            <Video className="w-3 h-3" />
                            <span>Meet Link</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleStudentList(item.id)}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{item.studentCount} Students</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Right: Reminder Audit & Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:self-center shrink-0">
                      {isReminded ? (
                        <div className="flex flex-col items-start sm:items-end gap-1">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-500/40 text-xs font-medium">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              Reminded ({new Date(item.reminderSentAt!).toLocaleTimeString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                hour: '2-digit',
                                minute: '2-digit',
                              })})
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-slate-400" />
                            Sent by: <strong className="text-slate-300">{item.reminderSentByName || 'Coach'}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start sm:items-end gap-1">
                          <NotifyStudentsButton
                            classInstanceId={item.id}
                            batchId={item.batchId}
                            batchName={item.batchName}
                            students={item.students?.map((s) => ({
                              id: s.id,
                              name: s.name,
                              phone: s.phone || '',
                            })) || []}
                            startTime={item.startTime}
                            endTime={item.endTime}
                            isToday={true}
                            isAdmin={true}
                            initialReminderSentAt={item.reminderSentAt}
                            sentByName={item.reminderSentByName}
                            onSuccess={(time) => handleReminderSuccess(item.id, time)}
                            size="md"
                            className="text-xs px-3 py-1.5"
                          />
                          <span className="text-[10px] text-amber-400/90 flex items-center gap-1">
                            <Info className="w-2.5 h-2.5" />
                            WhatsApp reminder not sent yet
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expandable Student List */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 bg-slate-950/50 p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>Enrolled Students ({item.students.length})</span>
                        <span className="text-[11px] text-slate-500">Recipients for WhatsApp class reminder</span>
                      </div>
                      {item.students.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">No students currently enrolled in this batch.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {item.students.map((student, sIdx) => (
                            <div
                              key={sIdx}
                              className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-2 rounded text-xs"
                            >
                              <span className="text-slate-200 font-medium truncate">{student.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono ml-2">
                                {student.phone || 'No phone'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guaranteed 1-time send: Database atomic lock & BullMQ queue prevent duplicate notifications.</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs self-end"
          >
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
