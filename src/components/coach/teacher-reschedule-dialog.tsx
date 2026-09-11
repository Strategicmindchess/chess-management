"use client";

import { useState } from "react";
import { CalendarClock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface TeacherRescheduleDialogProps {
  classInstanceId: string;
  batchName: string;
  originalDate: string;
  originalTime: string;
}

export function TeacherRescheduleDialog({
  classInstanceId,
  batchName,
  originalDate,
  originalTime,
}: TeacherRescheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reason, setReason] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [proposedStartTime, setProposedStartTime] = useState("");
  const [proposedEndTime, setProposedEndTime] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !proposedDate || !proposedStartTime || !proposedEndTime) {
      setError("Please fill all fields");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/reschedule-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classInstanceId,
          reason,
          proposedDate: new Date(proposedDate).toISOString(),
          proposedStartTime,
          proposedEndTime,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }
      
      setSuccess(true);
      setTimeout(() => setOpen(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setReason("");
    setProposedDate("");
    setProposedStartTime("");
    setProposedEndTime("");
    setSuccess(false);
    setError(null);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="w-full text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
      >
        <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
        Ask for Reschedule
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Request Class Reschedule"
        description={`Submit a reschedule request for ${batchName}. Management will review this request.`}
      >
        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CalendarClock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Request Submitted</h3>
            <p className="text-sm text-slate-500">Your reschedule request has been sent to management for approval. You'll be notified of their decision.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
              <p className="text-slate-500 mb-1">Original Schedule:</p>
              <p className="font-medium text-slate-900">{originalDate} at {originalTime}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reason for Rescheduling <span className="text-red-500">*</span></label>
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please explain why you need to reschedule..."
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Proposed New Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Proposed Start Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={proposedStartTime}
                    onChange={(e) => setProposedStartTime(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Proposed End Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={proposedEndTime}
                    onChange={(e) => setProposedEndTime(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start gap-2 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>You can reschedule up to 2 classes per month without penalty. Additional reschedules may incur a penalty based on management review.</p>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
