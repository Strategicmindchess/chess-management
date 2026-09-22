"use client";

import { useState, useTransition } from "react";
import { claimChocolateReward } from "@/actions/chocolate-actions";
import { Loader2, Gift, CheckCircle2, Trophy, ChevronDown } from "lucide-react";

type ChocolateStatus = {
  studentProfileId: string;
  month: string;
  totalPoints: number;
  maxPoints: number;
  rewardThreshold: number;
  isEligible: boolean;
  claimStatus: string;
  claimTicket: { ticketNumber: string; status: string } | null;
  todayRecord: { points: number; isCorrect: boolean } | null;
  history: { month: string; totalPoints: number; isEligible: boolean; claimStatus: string }[];
};

const CLAIM_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  NOT_CLAIMED: { label: "Not Claimed", color: "text-slate-400" },
  SUBMITTED: { label: "Claim Submitted ✅", color: "text-brand-400" },
  UNDER_REVIEW: { label: "Under Review 🔍", color: "text-amber-400" },
  APPROVED: { label: "Approved 🎉", color: "text-emerald-400" },
  DISPATCHED: { label: "Dispatched 🚚", color: "text-blue-400" },
  DELIVERED: { label: "Delivered 🎁", color: "text-emerald-400" },
};

function ClaimForm({ onSubmit, loading }: {
  onSubmit: (data: {
    fullAddress: string; city: string; state: string;
    pincode: string; mobileNumber: string; additionalInfo?: string;
  }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    fullAddress: "", city: "", state: "", pincode: "", mobileNumber: "", additionalInfo: "",
  });
  const inp = "w-full rounded-lg border border-slate-700 bg-[#111723] text-slate-200 placeholder:text-slate-500 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit(form); }}
      className="mt-4 space-y-3 bg-[#111723]/60 rounded-xl border border-brand-500/20 p-4"
    >
      <p className="text-sm font-semibold text-white mb-3">🏠 Delivery Address</p>
      <textarea
        className={`${inp} resize-none`} rows={3}
        placeholder="Full address (house no, street, area...)"
        value={form.fullAddress}
        onChange={e => setForm(p => ({ ...p, fullAddress: e.target.value }))}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input className={inp} placeholder="City" value={form.city}
          onChange={e => setForm(p => ({ ...p, city: e.target.value }))} required />
        <input className={inp} placeholder="State" value={form.state}
          onChange={e => setForm(p => ({ ...p, state: e.target.value }))} required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inp} placeholder="Pincode" value={form.pincode}
          onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} required />
        <input className={inp} placeholder="Mobile Number" value={form.mobileNumber}
          onChange={e => setForm(p => ({ ...p, mobileNumber: e.target.value }))} required />
      </div>
      <input className={inp} placeholder="Additional details (optional)" value={form.additionalInfo}
        onChange={e => setForm(p => ({ ...p, additionalInfo: e.target.value }))} />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
        Submit Chocolate Claim 🍫
      </button>
    </form>
  );
}

export function StudentChocolateCard({ status }: { status: ChocolateStatus }) {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [claimed, setClaimed] = useState(status.claimStatus !== "NOT_CLAIMED");
  const [ticketNo, setTicketNo] = useState(status.claimTicket?.ticketNumber ?? null);
  const [localStatus, setLocalStatus] = useState(status.claimStatus);
  const [localTotal, setLocalTotal] = useState(status.totalPoints);

  const pct = Math.round((localTotal / status.maxPoints) * 100);
  const needMore = Math.max(status.rewardThreshold - localTotal, 0);
  const isEligible = localTotal >= status.rewardThreshold;

  function handleClaim(data: Parameters<typeof claimChocolateReward>[0]) {
    startTransition(async () => {
      const res = await claimChocolateReward(data);
      if ("error" in res) {
        alert(res.error);
      } else {
        setClaimed(true);
        setTicketNo(res.ticketNumber);
        setLocalStatus("SUBMITTED");
        setShowForm(false);
      }
    });
  }

  return (
    <div className={`rounded-2xl border p-5 transition-all ${
      isEligible
        ? "border-brand-500/50 bg-gradient-to-br from-brand-900/20 to-amber-900/10"
        : "border-slate-700/50 bg-[#1a1f2e]"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">🍫</div>
        <div>
          <h3 className="font-bold text-white text-base">Monthly Chocolate Challenge</h3>
          <p className="text-xs text-slate-400">{status.month}</p>
        </div>
        {isEligible && (
          <span className="ml-auto text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            🎉 Eligible!
          </span>
        )}
      </div>

      {/* Points + progress */}
      <div className="mb-4">
        <div className="flex justify-between items-end mb-2">
          <span className={`text-3xl font-bold ${isEligible ? "text-brand-400" : "text-white"}`}>
            {localTotal}
          </span>
          <span className="text-slate-400 text-sm">/ {status.maxPoints} marks</span>
        </div>
        <div className="w-full bg-slate-700/40 rounded-full h-3 overflow-hidden relative">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${
              isEligible ? "bg-gradient-to-r from-brand-500 to-yellow-400" : "bg-brand-500"
            }`}
            style={{ width: `${pct}%` }}
          />
          {/* Threshold line at 38 */}
          <div
            className="absolute top-0 h-3 w-0.5 bg-white/60"
            style={{ left: `${(status.rewardThreshold / status.maxPoints) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-500">
          <span>0</span>
          <span className="text-brand-400/80">{status.rewardThreshold} 🍫</span>
          <span>{status.maxPoints}</span>
        </div>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-[#111723]/60 rounded-lg p-2.5 text-center">
          <p className="text-xs text-slate-400">Today's marks</p>
          <p className={`font-bold text-sm mt-0.5 ${
            status.todayRecord
              ? status.todayRecord.points > 0 ? "text-emerald-400" : "text-rose-400"
              : "text-slate-500"
          }`}>
            {status.todayRecord
              ? (status.todayRecord.points > 0 ? `+${status.todayRecord.points}` : status.todayRecord.points)
              : "Not marked"}
          </p>
        </div>
        <div className="bg-[#111723]/60 rounded-lg p-2.5 text-center">
          <p className="text-xs text-slate-400">Status</p>
          <p className={`font-bold text-xs mt-0.5 ${
            isEligible ? "text-emerald-400" : "text-slate-300"
          }`}>
            {isEligible ? "🍫 Chocolate Unlocked" : needMore > 0 ? `${needMore} more to go` : "In progress"}
          </p>
        </div>
      </div>

      {/* Claim section */}
      {isEligible && (
        <div className="mb-4">
          {claimed ? (
            <div>
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${
                CLAIM_STATUS_LABEL[localStatus]?.color ?? "text-slate-300"
              } bg-[#111723]/60 border-slate-700/50`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{CLAIM_STATUS_LABEL[localStatus]?.label ?? localStatus}</span>
                {ticketNo && <span className="text-xs text-slate-500 ml-auto">#{ticketNo.slice(-6)}</span>}
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowForm(v => !v)}
                className="w-full py-3 bg-gradient-to-r from-brand-600 to-yellow-600 hover:from-brand-700 hover:to-yellow-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <Gift className="w-4 h-4" />
                Claim Chocolate 🍫
              </button>
              {showForm && <ClaimForm onSubmit={handleClaim} loading={isPending} />}
            </>
          )}
        </div>
      )}

      {/* Monthly history */}
      {status.history.length > 1 && (
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" />
            Previous months
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`} />
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {status.history.map(h => (
                <div key={h.month} className="flex justify-between items-center bg-[#111723]/40 rounded-lg px-3 py-2 text-xs">
                  <span className="text-slate-400">{h.month}</span>
                  <span className="font-semibold text-slate-200">{h.totalPoints}/{status.maxPoints}</span>
                  <span>{h.isEligible ? "🍫" : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
