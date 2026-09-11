"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, CalendarSync, Ban, Loader2, Clock, Check, X, PlusCircle, RefreshCw, Settings2 } from "lucide-react";
import { generateMoreClassInstances } from "@/actions/batch-actions";
import { cancelClassInstance, updateClassInstance, rescheduleClassInstance, createClassInstance, bulkUpdateClassTimings } from "@/actions/manage-sessions";
import { useBatchSessions, invalidateBatchSessions } from "@/hooks/use-batch-sessions";

interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  lectureName?: string | null;
  sessionNumber?: number | null;
}

interface ManageSessionsDialogProps {
  batchId: string;
  batchName: string;
}

export function ManageSessionsDialog({ batchId, batchName }: ManageSessionsDialogProps) {
  const [open, setOpen] = useState(false);
  const { sessions, isLoading, error: sessionsError } = useBatchSessions(open ? batchId : null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [addCount, setAddCount] = useState<number>(5);

  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
  
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // Edit & Create States
  const [editDate, setEditDate] = useState<string>("");
  const [editStartTime, setEditStartTime] = useState<string>("");
  const [editEndTime, setEditEndTime] = useState<string>("");
  const [editLectureName, setEditLectureName] = useState<string>("");
  const [editSessionNumber, setEditSessionNumber] = useState<string>("");

  const [isPending, startTransition] = useTransition();

  function handleAddSessions(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (addCount <= 0 || addCount > 300) {
      setError("Please specify a number between 1 and 300.");
      return;
    }

    startTransition(async () => {
      const result = await generateMoreClassInstances(batchId, addCount);
      if (result.success) {
        setSuccessMessage(`Successfully scheduled the next ${addCount} class sessions.`);
        invalidateBatchSessions(batchId);
      } else {
        setError(result.error || "Failed to schedule classes.");
      }
    });
  }

  function handleCancelSession(sessionId: string) {
    if (!window.confirm("Are you sure you want to cancel this class session? This cannot be undone.")) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await cancelClassInstance(sessionId);
      if (result.success) {
        setSuccessMessage("Session has been cancelled successfully.");
        setUpdateDialogOpen(false);
        invalidateBatchSessions(batchId);
      } else {
        setError(result.error || "Failed to cancel session.");
      }
    });
  }

  function openUpdateDialog(session: Session) {
    setSelectedSession(session);
    setEditStartTime(session.startTime);
    setEditEndTime(session.endTime);
    setEditDate(session.date.split("T")[0]);
    setEditLectureName(session.lectureName || "");
    setEditSessionNumber(session.sessionNumber ? session.sessionNumber.toString() : "");
    setUpdateDialogOpen(true);
  }

  function openRescheduleDialog(session: Session) {
    setSelectedSession(session);
    setEditStartTime(session.startTime);
    setEditEndTime(session.endTime);
    setEditDate(session.date.split("T")[0]);
    setRescheduleDialogOpen(true);
  }

  function openCreateDialog() {
    setEditStartTime("");
    setEditEndTime("");
    setEditDate("");
    setEditLectureName("");
    setEditSessionNumber("");
    setCreateDialogOpen(true);
  }

  function handleUpdateTiming(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSession) return;

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await updateClassInstance({
        instanceId: selectedSession.id,
        newDate: editDate,
        newStartTime: editStartTime,
        newEndTime: editEndTime,
        lectureName: editLectureName || null,
        sessionNumber: editSessionNumber ? parseInt(editSessionNumber, 10) : null
      });
      if (result.success) {
        setSuccessMessage("Session updated successfully.");
        setUpdateDialogOpen(false);
        invalidateBatchSessions(batchId);
      } else {
        setError(result.error || "Failed to update session.");
      }
    });
  }

  function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSession) return;

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await rescheduleClassInstance({
        instanceId: selectedSession.id,
        newDate: editDate,
        newStartTime: editStartTime,
        newEndTime: editEndTime,
      });
      if (result.success) {
        setSuccessMessage("Session rescheduled successfully.");
        setRescheduleDialogOpen(false);
        invalidateBatchSessions(batchId);
      } else {
        setError(result.error || "Failed to reschedule session.");
      }
    });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await createClassInstance({
        batchId,
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        lectureName: editLectureName || null,
        sessionNumber: editSessionNumber ? parseInt(editSessionNumber, 10) : null
      });
      if (result.success) {
        setSuccessMessage("Session created successfully.");
        setCreateDialogOpen(false);
        invalidateBatchSessions(batchId);
      } else {
        setError(result.error || "Failed to create session.");
      }
    });
  }

  function handleBulkUpdate(e: React.FormEvent) {
    e.preventDefault();

    if (!window.confirm("This will update the start and end times of ALL future SCHEDULED classes for this batch. Are you sure?")) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await bulkUpdateClassTimings({
        batchId,
        newStartTime: editStartTime,
        newEndTime: editEndTime,
      });
      if (result.success) {
        setSuccessMessage("Bulk update completed successfully.");
        setBulkUpdateDialogOpen(false);
        invalidateBatchSessions(batchId);
      } else {
        setError(result.error || "Failed to bulk update timings.");
      }
    });
  }

  function openBulkUpdateDialog() {
    setEditStartTime("");
    setEditEndTime("");
    setBulkUpdateDialogOpen(true);
  }

  // Calculate status counts
  const totalCount = sessions.length;
  const completedCount = sessions.filter((s) => s.status === "COMPLETED").length;
  const scheduledCount = sessions.filter((s) => s.status === "SCHEDULED").length;
  const cancelledCount = sessions.filter((s) => s.status === "CANCELLED").length;

  return (
    <>
      <Button 
        variant="secondary" 
        size="sm" 
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5"
      >
        <CalendarRange className="h-3.5 w-3.5" />
        Manage Sessions
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Manage Sessions — ${batchName}`}
        className="max-w-2xl"
      >
        <div className="space-y-6">
          {/* Metrics summary */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="text-center">
              <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Total</span>
              <span className="text-lg font-bold text-slate-800">{totalCount}</span>
            </div>
            <div className="text-center border-l border-slate-200">
              <span className="block text-xs font-medium text-emerald-600 uppercase tracking-wider">Completed</span>
              <span className="text-lg font-bold text-emerald-700">{completedCount}</span>
            </div>
            <div className="text-center border-l border-slate-200">
              <span className="block text-xs font-medium text-blue-600 uppercase tracking-wider">Scheduled</span>
              <span className="text-lg font-bold text-blue-700">{scheduledCount}</span>
            </div>
            <div className="text-center border-l border-slate-200">
              <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Cancelled</span>
              <span className="text-lg font-bold text-slate-500">{cancelledCount}</span>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-3 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-md">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-3 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md">
              {successMessage}
            </div>
          )}

          {/* Add more instances form & Create Manual */}
          <div className="flex flex-col gap-4 p-4 border border-slate-200 rounded-lg bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <CalendarSync className="h-4 w-4 text-brand-600" />
                  Auto-Schedule More Classes
                </h4>
                <p className="text-xs text-slate-500">
                  Generate future sessions based on the batch schedule.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={openBulkUpdateDialog} className="text-xs">
                  <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                  Bulk Update Timings
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={openCreateDialog} className="text-xs">
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                  Add Session Manually
                </Button>
              </div>
            </div>
            <form onSubmit={handleAddSessions} className="flex items-end gap-3 pt-2 border-t border-slate-100">
              <div className="flex-1 max-w-[200px]">
                <Label htmlFor="addCount" className="text-xs">Number of classes to add</Label>
                <Input
                  id="addCount"
                  type="number"
                  min="1"
                  max="300"
                  value={addCount}
                  onChange={(e) => setAddCount(Number(e.target.value))}
                  required
                />
              </div>
              <Button type="submit" disabled={isPending || isLoading} className="h-10">
                {isPending ? "Generating..." : "Generate Classes"}
              </Button>
            </form>
          </div>

          {/* Sessions List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Class Sessions History & Schedule</h4>
            
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-[300px] overflow-y-auto divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  <span className="text-sm">Loading sessions...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 bg-slate-50/50">
                  No sessions have been scheduled yet for this batch.
                </div>
              ) : (
                sessions.map((session) => {
                  const sessionDate = new Date(session.date);
                  const isScheduled = session.status === "SCHEDULED";
                  const isCompleted = session.status === "COMPLETED";
                  const isCancelled = session.status === "CANCELLED";

                  let badgeColor: "neutral" | "success" | "brand" = "neutral";
                  if (isCompleted) badgeColor = "success";
                  if (isScheduled) badgeColor = "brand";

                  return (
                    <div key={session.id} className="p-3.5 flex flex-col gap-3 hover:bg-slate-50/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            {session.sessionNumber && session.lectureName ? (
                              <span>Lecture {session.sessionNumber}: {session.lectureName}</span>
                            ) : session.sessionNumber ? (
                              <span>Lecture {session.sessionNumber}</span>
                            ) : (
                              <span>Class Session</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            {sessionDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })} &bull; {session.startTime} – {session.endTime}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant={badgeColor} className="capitalize text-xs font-normal">
                            {session.status.toLowerCase()}
                          </Badge>
                          {isScheduled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openUpdateDialog(session)}
                              className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 h-8 px-3 flex items-center gap-1.5 text-xs font-medium"
                              disabled={isPending}
                            >
                              Update
                            </Button>
                          )}
                          {isCancelled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openRescheduleDialog(session)}
                              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-8 px-3 flex items-center gap-1.5 text-xs font-medium"
                              disabled={isPending}
                            >
                              Reschedule
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Update Session Popup */}
      <Dialog
        open={updateDialogOpen}
        onClose={() => setUpdateDialogOpen(false)}
        title="Update Class Session"
        className="max-w-md"
      >
        {selectedSession && (
          <form onSubmit={handleUpdateTiming} className="space-y-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="update-date" className="text-xs font-medium">Date</Label>
                  <Input id="update-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="update-session-number" className="text-xs font-medium">Session Number</Label>
                  <Input id="update-session-number" type="number" min="1" value={editSessionNumber} onChange={(e) => setEditSessionNumber(e.target.value)} placeholder="e.g. 4" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="update-start" className="text-xs font-medium">Start Time</Label>
                  <Input id="update-start" type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="update-end" className="text-xs font-medium">End Time</Label>
                  <Input id="update-end" type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="update-lecture-name" className="text-xs font-medium">Lecture Name / Topic</Label>
                <Input id="update-lecture-name" type="text" value={editLectureName} onChange={(e) => setEditLectureName(e.target.value)} placeholder="e.g. Fundamentals of Chess" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="h-9 px-3 text-xs"
                onClick={() => handleCancelSession(selectedSession.id)}
                disabled={isPending}
              >
                <Ban className="h-3.5 w-3.5 mr-1.5" />
                Cancel Session
              </Button>
              
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setUpdateDialogOpen(false)} disabled={isPending}>
                  Close
                </Button>
                <Button type="submit" size="sm" className="h-9 px-4 text-xs" disabled={isPending}>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </Dialog>

      {/* Reschedule Session Popup */}
      <Dialog
        open={rescheduleDialogOpen}
        onClose={() => setRescheduleDialogOpen(false)}
        title="Reschedule Class Session"
        className="max-w-md"
      >
        {selectedSession && (
          <form onSubmit={handleReschedule} className="space-y-5">
            <div className="space-y-1 pb-3 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-900">
                {selectedSession.sessionNumber && selectedSession.lectureName
                  ? `Lecture ${selectedSession.sessionNumber}: ${selectedSession.lectureName}`
                  : "Cancelled Session"}
              </h4>
              <p className="text-xs text-slate-500">
                Change the date and time to restore this cancelled session to SCHEDULED status.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="res-date" className="text-xs font-medium">New Date</Label>
                <Input id="res-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="res-start" className="text-xs font-medium">New Start Time</Label>
                  <Input id="res-start" type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="res-end" className="text-xs font-medium">New End Time</Label>
                  <Input id="res-end" type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRescheduleDialogOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reschedule
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Create Manual Session Popup */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        title="Create Session Manually"
        className="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-1 pb-3 border-b border-slate-100">
            <p className="text-xs text-slate-500">
              Manually add a session at any specific date and time. It will be checked for scheduling conflicts.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-date" className="text-xs font-medium">Date</Label>
                <Input id="create-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-session-number" className="text-xs font-medium">Session Number</Label>
                <Input id="create-session-number" type="number" min="1" value={editSessionNumber} onChange={(e) => setEditSessionNumber(e.target.value)} placeholder="e.g. 4" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-start" className="text-xs font-medium">Start Time</Label>
                <Input id="create-start" type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-end" className="text-xs font-medium">End Time</Label>
                <Input id="create-end" type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-lecture-name" className="text-xs font-medium">Lecture Name / Topic</Label>
              <Input id="create-lecture-name" type="text" value={editLectureName} onChange={(e) => setEditLectureName(e.target.value)} placeholder="e.g. Fundamentals of Chess" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreateDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Create Session
            </Button>
          </div>
        </form>
      </Dialog>
      {/* Bulk Update Dialog */}
      <Dialog
        open={bulkUpdateDialogOpen}
        onClose={() => setBulkUpdateDialogOpen(false)}
        title="Bulk Update Timings"
        className="max-w-md"
      >
        <form onSubmit={handleBulkUpdate} className="space-y-5">
          <div className="space-y-1 pb-3 border-b border-slate-100">
            <p className="text-xs text-slate-500">
              Update the start and end times for <b>ALL future SCHEDULED</b> sessions of this batch, starting from today.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-start" className="text-xs font-medium">New Start Time</Label>
                <Input id="bulk-start" type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-end" className="text-xs font-medium">New End Time</Label>
                <Input id="bulk-end" type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} required />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setBulkUpdateDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
              Update All
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

