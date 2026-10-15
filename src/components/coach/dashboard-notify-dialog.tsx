'use client';

import { useState } from 'react';
import { Bell, Users, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { NotifyStudentsButton } from './notify-students-button';

export interface DashboardClassItem {
  id: string;
  batchId: string;
  batchName: string;
  batchCode: string;
  startTime: string;
  endTime: string;
  studentCount: number;
  reminderSentAt?: Date | string | null;
  status: string;
}

interface DashboardNotifyDialogProps {
  classes: DashboardClassItem[];
}

export function DashboardNotifyDialog({ classes }: DashboardNotifyDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Quick Action Card on Teacher Dashboard */}
      <div
        onClick={() => setOpen(true)}
        className="group rounded-xl bg-amber-950/30 border border-amber-900/50 p-5 hover:bg-amber-900/30 hover:border-amber-500/50 transition-all flex flex-col justify-between cursor-pointer"
        role="button"
        tabIndex={0}
      >
        <div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Bell className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-white font-bold mb-1 flex items-center gap-2">
            <span>Notify Batch</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              WhatsApp
            </span>
          </h3>
          <p className="text-sm text-slate-400">Send instant 1-hour class reminder to enrolled students</p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-amber-400/80 font-medium">
            {classes.length} {classes.length === 1 ? 'class' : 'classes'} today
          </span>
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Notify Class Students via WhatsApp"
        description="Select a class scheduled for today to send meet link reminders to students."
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Trust & Safety Rule:</p>
              <p className="text-amber-300/90 mt-0.5">
                Reminders open <strong>1 hour before</strong> class starts and can only be sent <strong>once</strong> per session.
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {classes.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
                <p className="font-medium text-white">No classes scheduled for today.</p>
                <p className="text-xs text-slate-500 mt-1">Class reminders are only available on the day of the class.</p>
              </div>
            ) : (
              classes.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-sm">{cls.batchName}</p>
                      <Badge variant="neutral" className="text-[10px] px-1.5 py-0 border-none bg-slate-800 text-slate-300">
                        {cls.batchCode}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {cls.startTime} - {cls.endTime}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {cls.studentCount} Students
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <NotifyStudentsButton
                      classInstanceId={cls.id}
                      batchId={cls.batchId}
                      batchName={cls.batchName}
                      initialReminderSentAt={cls.reminderSentAt}
                      startTime={cls.startTime}
                      endTime={cls.endTime}
                      isToday={true}
                      isCancelled={cls.status === 'CANCELLED'}
                      size="sm"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
