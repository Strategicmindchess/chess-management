"use client";

import { useState, useEffect, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, CalendarSync, Ban, HelpCircle, Loader2 } from "lucide-react";
import { getBatchSessions, generateMoreClassInstances, cancelClassInstance } from "@/actions/batch-actions";

interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface ManageSessionsDialogProps {
  batchId: string;
  batchName: string;
}

export function ManageSessionsDialog({ batchId, batchName }: ManageSessionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [addCount, setAddCount] = useState<number>(5);

  const [isPending, startTransition] = useTransition();

  async function fetchSessions() {
    setIsLoading(true);
    setError(null);
    const result = await getBatchSessions(batchId);
    setIsLoading(false);
    if (result.success && result.data) {
      setSessions(result.data);
    } else {
      setError(result.error || "Failed to load sessions.");
    }
  }

  useEffect(() => {
    if (open) {
      fetchSessions();
      setSuccessMessage(null);
      setError(null);
    }
  }, [open, batchId]);

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
        fetchSessions();
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
        fetchSessions();
      } else {
        setError(result.error || "Failed to cancel session.");
      }
    });
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

          {/* Add more instances form */}
          <form onSubmit={handleAddSessions} className="p-4 border border-slate-200 rounded-lg space-y-3 bg-white">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <CalendarSync className="h-4 w-4 text-brand-600" />
              Schedule More Classes
            </h4>
            <p className="text-xs text-slate-500">
              Generate more sessions chronologically starting from the day after the last scheduled class based on the batch schedule.
            </p>
            <div className="flex items-end gap-3 pt-1">
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
            </div>
          </form>

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
                    <div key={session.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {sessionDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          {session.startTime} – {session.endTime}
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
                            onClick={() => handleCancelSession(session.id)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 flex items-center gap-1 text-xs"
                            title="Cancel Session"
                            disabled={isPending}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        )}
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
    </>
  );
}
