"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { usePendingFeedback, invalidatePendingFeedback } from "@/hooks/use-pending-feedback";

export function MandatoryFeedbackModal() {
  const router = useRouter();
  const { pendingLogs, isLoading } = usePendingFeedback();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [cameraOff, setCameraOff] = useState(false);
  const [phoneUsed, setPhoneUsed] = useState(false);
  const [classQualityScore, setClassQualityScore] = useState<number>(8);
  const [conceptUnderstood, setConceptUnderstood] = useState(true);
  const [coachLateDuration, setCoachLateDuration] = useState<string>("ON_TIME");

  const currentLog = pendingLogs[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLog) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/class-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classLogId: currentLog.id,
          cameraOffOver5Min: cameraOff,
          phoneUsedOver4Times: phoneUsed,
          classQualityScore,
          conceptUnderstood,
          coachLateDuration,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit feedback");
      }

      // Reset form
      setCameraOff(false);
      setPhoneUsed(false);
      setClassQualityScore(8);
      setConceptUnderstood(true);
      setCoachLateDuration("ON_TIME");

      // Invalidate SWR cache → next render will see updated pending list
      await invalidatePendingFeedback();
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || pendingLogs.length === 0) return null;

  return (
    <Dialog
      open={true}
      onClose={() => {}}
      title="Action Required: Class Feedback"
      description="You must submit feedback for your recent class to continue using the dashboard."
      hideCloseButton
    >
      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        <div className="bg-slate-50 p-3 rounded-md text-sm mb-4">
          <p><strong>Batch:</strong> {currentLog.batch.name} ({currentLog.batch.type})</p>
          <p><strong>Coach:</strong> {currentLog.coach.user.name}</p>
          <p><strong>Date:</strong> {new Date(currentLog.classInstance.date).toLocaleDateString()}</p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="cameraOff"
            checked={cameraOff}
            onChange={(e) => setCameraOff(e.target.checked)}
          />
          <Label htmlFor="cameraOff">Coach kept camera OFF for more than 5 minutes</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="phoneUsed"
            checked={phoneUsed}
            onChange={(e) => setPhoneUsed(e.target.checked)}
          />
          <Label htmlFor="phoneUsed">Coach used phone more than 4 times</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="conceptUnderstood"
            checked={conceptUnderstood}
            onChange={(e) => setConceptUnderstood(e.target.checked)}
          />
          <Label htmlFor="conceptUnderstood">I understood the concepts taught today</Label>
        </div>

        <div className="flex flex-col space-y-2">
          <Label htmlFor="coachLateDuration">Did the coach start the class late?</Label>
          <select
            id="coachLateDuration"
            value={coachLateDuration}
            onChange={(e) => setCoachLateDuration(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
          >
            <option value="ON_TIME">No, on time (or early)</option>
            <option value="1_TO_5_MIN">Yes, 1-5 mins late</option>
            <option value="5_TO_15_MIN">Yes, 5-15 mins late</option>
            <option value="MORE_THAN_15_MIN">Yes, &gt;15 mins late</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Class Quality Score (1–10)</Label>
          <p className="text-xs text-slate-500">How would you rate the overall quality of this class?</p>
          <div className="flex gap-2 flex-wrap">
            {[...Array(10)].map((_, i) => (
              <button
                key={i + 1}
                type="button"
                onClick={() => setClassQualityScore(i + 1)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                  classQualityScore === i + 1
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

