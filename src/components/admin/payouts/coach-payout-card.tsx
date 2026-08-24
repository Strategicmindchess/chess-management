"use client";

import { useState } from "react";
import type { CoachPayoutSummary } from "@/actions/payout-actions";

interface Props {
  coach: CoachPayoutSummary;
  monthString: string;
}

const ADJUSTMENT_COLORS: Record<string, string> = {
  BONUS: "text-emerald-600",
  INCENTIVE: "text-blue-600",
  DEDUCTION: "text-rose-600",
};

export function CoachPayoutCard({ coach, monthString }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm">
            {coach.coachName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900">{coach.coachName}</p>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {coach.employmentType}
              </span>
              {coach.tdsApplicable && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  TDS 10%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {coach.totalSessions} sessions · {coach.batches.length} batch{coach.batches.length !== 1 ? "es" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400">Gross</p>
            <p className="font-semibold text-slate-700">₹{coach.grossPayout.toLocaleString()}</p>
          </div>
          {coach.totalPenalties > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Penalties</p>
              <p className="font-semibold text-rose-600">−₹{coach.totalPenalties.toLocaleString()}</p>
            </div>
          )}
          {coach.tdsApplicable && coach.tdsAmount > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">TDS</p>
              <p className="font-semibold text-amber-600">−₹{coach.tdsAmount.toLocaleString()}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-slate-400">Net</p>
            <p className="text-lg font-bold text-emerald-700">₹{coach.netPayout.toLocaleString()}</p>
          </div>
          <span className="text-slate-400 text-sm">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 p-5 space-y-5 bg-slate-50/50">

          {/* Batch breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Batch Breakdown</h4>
            <div className="space-y-2">
              {coach.batches.map((b) => (
                <div key={b.batchId} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{b.batchName}</p>
                    <p className="text-xs text-slate-500">{b.sessions} sessions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-700">₹{b.payout.toLocaleString()}</p>
                    {b.penalties > 0 && (
                      <p className="text-xs text-rose-500">−₹{b.penalties} penalty</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adjustments */}
          {coach.adjustments.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Adjustments</h4>
              <div className="space-y-2">
                {coach.adjustments.map((adj) => (
                  <div key={adj.id} className="flex justify-between items-start text-sm py-1.5">
                    <div>
                      <span className={`text-xs font-semibold uppercase ${ADJUSTMENT_COLORS[adj.type] ?? "text-slate-600"}`}>
                        {adj.type}
                      </span>
                      <p className="text-slate-600 text-xs mt-0.5">{adj.reason}</p>
                    </div>
                    <span className={`font-semibold ${adj.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {adj.amount >= 0 ? "+" : ""}₹{adj.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final calculation breakdown */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Gross Payout</span>
              <span>₹{coach.grossPayout.toLocaleString()}</span>
            </div>
            {coach.totalPenalties > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Penalties</span>
                <span>−₹{coach.totalPenalties.toLocaleString()}</span>
              </div>
            )}
            {coach.totalAdjustments !== 0 && (
              <div className={`flex justify-between ${coach.totalAdjustments >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                <span>Adjustments</span>
                <span>{coach.totalAdjustments >= 0 ? "+" : ""}₹{coach.totalAdjustments.toLocaleString()}</span>
              </div>
            )}
            {coach.tdsApplicable && coach.tdsAmount > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>TDS (10%)</span>
                <span>−₹{coach.tdsAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-2 mt-1">
              <span>Net Payout</span>
              <span className="text-emerald-700">₹{coach.netPayout.toLocaleString()}</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
