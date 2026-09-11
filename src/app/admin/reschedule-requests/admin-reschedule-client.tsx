"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Check, X, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RescheduleRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "APPROVED_WITH_PENALTY" | "REJECTED";
  reason: string;
  proposedDate: string;
  proposedStartTime: string;
  proposedEndTime: string;
  penaltyAmount: number;
  penaltyReason: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  coach: {
    id: string;
    name: string;
    email: string;
    approvedThisMonth: number;
    shouldOfferPenalty: boolean;
  };
  classInstance: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    batchName: string;
    batchCode: string;
  };
  replacementCoach: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-red-100 text-red-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  APPROVED_WITH_PENALTY: "bg-amber-100 text-amber-700",
  REJECTED: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  APPROVED_WITH_PENALTY: "Approved with Penalty",
  REJECTED: "Rejected",
};

export function AdminRescheduleClient() {
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("PENDING");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<Record<string, {
    action: string;
    rejectionReason: string;
    penaltyAmount: string;
    penaltyReason: string;
    applyReschedule: boolean;
  }>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reschedule-requests?status=${filter}`);
      const data = await res.json();
      setRequests(data.requests ?? []);
      setPendingCount(data.pendingCount ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const getForm = (id: string) => reviewForm[id] ?? {
    action: "APPROVE",
    rejectionReason: "",
    penaltyAmount: "0",
    penaltyReason: "",
    applyReschedule: true,
  };

  const handleReview = async (requestId: string) => {
    const form = getForm(requestId);
    setReviewingId(requestId);
    try {
      const body: Record<string, unknown> = {
        action: form.action,
        applyReschedule: form.applyReschedule,
      };
      if (form.action === "REJECT") body.rejectionReason = form.rejectionReason;
      if (form.action === "APPROVE_WITH_PENALTY") {
        body.penaltyAmount = parseInt(form.penaltyAmount, 10);
        body.penaltyReason = form.penaltyReason;
      }

      const res = await fetch(`/api/admin/reschedule-requests/${requestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-7 h-7 text-red-500" />
            Coach Reschedule Requests
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            First 2 approvals/month free. After that, you may set a penalty stored in the system.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["PENDING", "APPROVED", "REJECTED", "APPROVED_WITH_PENALTY"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? STATUS_STYLES[s] + " ring-2 ring-offset-1 ring-current" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <RotateCcw className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No {STATUS_LABEL[filter].toLowerCase()} requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const form = getForm(req.id);
            const isReviewing = reviewingId === req.id;

            return (
              <div
                key={req.id}
                className={`rounded-xl border p-5 ${req.status === "PENDING" ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-white"}`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status]}`}>
                        {STATUS_LABEL[req.status]}
                      </span>
                      {req.coach.shouldOfferPenalty && req.status === "PENDING" && (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          3rd+ approval this month — penalty option available
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900">
                      {req.coach.name} — {req.classInstance.batchCode} ({req.classInstance.batchName})
                    </p>
                    <p className="text-sm text-slate-500">
                      Original: {new Date(req.classInstance.date).toLocaleDateString("en-IN")} {req.classInstance.startTime}–{req.classInstance.endTime}
                    </p>
                    <p className="text-sm text-slate-500">
                      Proposed: {new Date(req.proposedDate).toLocaleDateString("en-IN")} {req.proposedStartTime}–{req.proposedEndTime}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 bg-white rounded-lg border border-slate-100 px-3 py-2 italic">
                      "{req.reason}"
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-400 shrink-0">
                    <p>{new Date(req.createdAt).toLocaleDateString("en-IN")}</p>
                    <p className="text-slate-500">Approvals this month: <strong>{req.coach.approvedThisMonth}</strong></p>
                    {req.reviewedBy && <p>Reviewed by: {req.reviewedBy}</p>}
                    {req.penaltyAmount > 0 && (
                      <p className="text-amber-700 font-bold">Penalty: ₹{req.penaltyAmount}</p>
                    )}
                  </div>
                </div>

                {/* Review panel — only for PENDING */}
                {req.status === "PENDING" && (
                  <div className="border-t border-red-100 pt-4 space-y-3">
                    {/* Action selector */}
                    <div className="flex flex-wrap gap-2">
                      {["APPROVE", "APPROVE_WITH_PENALTY", "REJECT"].map((action) => (
                        <button
                          key={action}
                          onClick={() =>
                            setReviewForm((prev) => ({
                              ...prev,
                              [req.id]: { ...getForm(req.id), action },
                            }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            form.action === action
                              ? action === "APPROVE" ? "bg-emerald-600 text-white border-emerald-600"
                              : action === "APPROVE_WITH_PENALTY" ? "bg-amber-600 text-white border-amber-600"
                              : "bg-red-600 text-white border-red-600"
                              : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                          }`}
                        >
                          {action === "APPROVE" ? "✅ Approve" : action === "APPROVE_WITH_PENALTY" ? "⚠️ Approve with Penalty" : "❌ Reject"}
                        </button>
                      ))}
                    </div>

                    {/* Conditional fields */}
                    {form.action === "REJECT" && (
                      <input
                        type="text"
                        placeholder="Rejection reason (optional)"
                        value={form.rejectionReason}
                        onChange={(e) =>
                          setReviewForm((prev) => ({
                            ...prev,
                            [req.id]: { ...getForm(req.id), rejectionReason: e.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    )}
                    {form.action === "APPROVE_WITH_PENALTY" && (
                      <div className="flex gap-3">
                        <input
                          type="number"
                          placeholder="Penalty ₹ amount"
                          min={0}
                          value={form.penaltyAmount}
                          onChange={(e) =>
                            setReviewForm((prev) => ({
                              ...prev,
                              [req.id]: { ...getForm(req.id), penaltyAmount: e.target.value },
                            }))
                          }
                          className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Penalty reason"
                          value={form.penaltyReason}
                          onChange={(e) =>
                            setReviewForm((prev) => ({
                              ...prev,
                              [req.id]: { ...getForm(req.id), penaltyReason: e.target.value },
                            }))
                          }
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                    )}

                    {/* Apply reschedule toggle */}
                    {form.action !== "REJECT" && (
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.applyReschedule}
                          onChange={(e) =>
                            setReviewForm((prev) => ({
                              ...prev,
                              [req.id]: { ...getForm(req.id), applyReschedule: e.target.checked },
                            }))
                          }
                          className="rounded border-slate-300"
                        />
                        Apply proposed date/time to class instance
                      </label>
                    )}

                    <Button
                      onClick={() => handleReview(req.id)}
                      disabled={isReviewing}
                      className={
                        form.action === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : form.action === "APPROVE_WITH_PENALTY" ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                      }
                    >
                      {isReviewing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Submit Decision
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
