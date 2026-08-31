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
          <Label htmlFor="conceptUnderstood">I understood the concepts taught</Label>
        </div>

        <div className="space-y-2">
          <Label>Class Quality Score (1-10)</Label>
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
