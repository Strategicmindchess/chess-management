"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const LEVELS = [
  "BEGINNER","CORE_1","CORE_2","CORE_3","CORE_4",
  "INTERMEDIATE_1","INTERMEDIATE_2","INTERMEDIATE_3",
  "ADVANCE_1","ADVANCE_2","ELITE"
];
const DURATIONS = [30, 40, 45, 50, 60];
const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Beginner", CORE_1: "Core 1", CORE_2: "Core 2", CORE_3: "Core 3",
  CORE_4: "Core 4", INTERMEDIATE_1: "Int. 1", INTERMEDIATE_2: "Int. 2",
  INTERMEDIATE_3: "Int. 3", ADVANCE_1: "Adv. 1", ADVANCE_2: "Adv. 2", ELITE: "Elite",
};

interface PayoutRate { level: string; durationMins: number; ratePerSession: number; }
interface Adjustment { id: string; type: string; amount: number; reason: string; createdAt?: string; month?: string; }
interface ClassLog {
  id: string; date: string | Date; batch?: { name: string } | null;
  penaltyAmount: number; penaltyWaived: boolean; penaltyNote?: string | null;
}

interface Props {
  coachId: string;
  tdsApplicable: boolean;
  employmentType: string;
  payoutRates: PayoutRate[];
  payoutAdjustments: Adjustment[];
  classLogs: ClassLog[];
  penalizedLogs: ClassLog[];
  coachPenaltyTotal: number;
}

function fmt(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(typeof d === "string" ? d + (String(d).includes("T") ? "" : "T00:00:00") : d)
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function CoachPayoutSettings({
  coachId, tdsApplicable: initialTds, employmentType: initialEmpType,
  payoutRates: initialRates, payoutAdjustments: initialAdj, classLogs: initialLogs, penalizedLogs: initialPenalizedLogs,
  coachPenaltyTotal: initialPenaltyTotal,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // TDS + employment
  const [tds, setTds] = useState(initialTds);
  const [empType, setEmpType] = useState(initialEmpType);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Payout rates
  const [rates, setRates] = useState<PayoutRate[]>(initialRates);
  const [editingRate, setEditingRate] = useState<{ level: string; dur: number; val: string } | null>(null);
  const [rateSaving, setRateSaving] = useState(false);

  // Adjustments
  const [adjustments, setAdjustments] = useState<Adjustment[]>(initialAdj);
  const [adjModal, setAdjModal] = useState(false);
  const [adjForm, setAdjForm] = useState({ type: "BONUS", amount: "", reason: "", month: new Date().toISOString().slice(0, 7) });
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjError, setAdjError] = useState<string | null>(null);

  // Class logs with penalties
  const [logs, setLogs] = useState<ClassLog[]>(initialLogs);
  const [penalties, setPenalties] = useState<ClassLog[]>(initialPenalizedLogs);
  const [waivedIds, setWaivedIds] = useState<Set<string>>(
    new Set(initialPenalizedLogs.filter(l => l.penaltyWaived).map(l => l.id))
  );
  const [penaltyModal, setPenaltyModal] = useState<ClassLog | null>(null);
  const [penaltyForm, setPenaltyForm] = useState({ amount: "", note: "", waived: false });
  const [penaltyLoading, setPenaltyLoading] = useState(false);

  // ── TDS / Employment Type ──────────────────────────────────────────────────
  async function saveSettings(newTds?: boolean, newEmpType?: string) {
    setSettingsLoading(true);
    await fetch(`/api/coach/${coachId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tdsApplicable: newTds ?? tds,
        employmentType: newEmpType ?? empType,
      }),
    });
    setSettingsLoading(false);
    startTransition(() => router.refresh());
  }

  // ── Payout Rate edit ──────────────────────────────────────────────────────
  async function saveRate(level: string, dur: number, val: string) {
    const rate = Number(val);
    if (isNaN(rate) || rate < 0) return;
    setRateSaving(true);
    const res = await fetch(`/api/coach/${coachId}/payout-rates`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, durationMins: dur, ratePerSession: rate }),
    });
    setRateSaving(false);
    setEditingRate(null);
    if (res.ok) {
      setRates(prev => {
        const existing = prev.findIndex(r => r.level === level && r.durationMins === dur);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { level, durationMins: dur, ratePerSession: rate };
          return updated;
        }
        return [...prev, { level, durationMins: dur, ratePerSession: rate }];
      });
    }
  }

  // ── Adjustments ───────────────────────────────────────────────────────────
  async function submitAdjustment() {
    setAdjError(null);
    if (!adjForm.reason.trim()) { setAdjError("Reason is required"); return; }
    const amount = Number(adjForm.amount);
    if (isNaN(amount)) { setAdjError("Amount must be a number"); return; }
    setAdjLoading(true);
    const res = await fetch(`/api/coach/${coachId}/adjustments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...adjForm, amount }),
    });
    setAdjLoading(false);
    if (!res.ok) { setAdjError("Failed to save adjustment"); return; }
    const data = await res.json();
    setAdjustments(prev => [data.adjustment, ...prev]);
    setAdjModal(false);
    setAdjForm({ type: "BONUS", amount: "", reason: "", month: new Date().toISOString().slice(0, 7) });
  }

  async function deleteAdjustment(id: string) {
    await fetch(`/api/coach/${coachId}/adjustments?id=${id}`, { method: "DELETE" });
    setAdjustments(prev => prev.filter(a => a.id !== id));
  }

  // ── Penalty waive / edit ──────────────────────────────────────────────────
  function openPenaltyModal(log: ClassLog) {
    setPenaltyForm({ amount: String(log.penaltyAmount), note: log.penaltyNote ?? "", waived: log.penaltyWaived });
    setPenaltyModal(log);
  }

  async function savePenalty() {
    if (!penaltyModal) return;
    setPenaltyLoading(true);
    const res = await fetch(`/api/class-logs/${penaltyModal.id}/penalty`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        penaltyAmount: Number(penaltyForm.amount),
        penaltyNote: penaltyForm.note,
        penaltyWaived: penaltyForm.waived,
      }),
    });
    setPenaltyLoading(false);
    if (res.ok) {
      const { classLog } = await res.json();
      setLogs(prev => prev.map(l => l.id === penaltyModal.id ? { ...l, ...classLog } : l));
      setPenalties(prev => prev.map(l => l.id === penaltyModal.id ? { ...l, ...classLog } : l));
      if (penaltyForm.waived) setWaivedIds(prev => new Set([...prev, penaltyModal.id]));
      else setWaivedIds(prev => { const s = new Set(prev); s.delete(penaltyModal.id); return s; });
      setPenaltyModal(null);
    }
  }

  const netPenalties = penalties.reduce((acc, l) => {
    if (!waivedIds.has(l.id)) return acc + (l.penaltyAmount ?? 0);
    return acc;
  }, 0);

  const groupedPenalties = penalties.reduce((acc, log) => {
    const month = new Date(log.date).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(log);
    return acc;
  }, {} as Record<string, ClassLog[]>);

  const ADJ_COLORS: Record<string, string> = { BONUS: "text-emerald-600", INCENTIVE: "text-blue-600", DEDUCTION: "text-rose-600" };

  return (
    <div className="space-y-6">

      {/* ── Settings Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        {/* TDS Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">TDS (10%)</span>
          <button
            onClick={async () => { const next = !tds; setTds(next); await saveSettings(next); }}
            disabled={settingsLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${tds ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${tds ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">{tds ? "10% deducted" : "Not applicable"}</span>
        </div>

        {/* Employment Type */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Type:</span>
          <select
            value={empType}
            onChange={async (e) => { setEmpType(e.target.value); await saveSettings(undefined, e.target.value); }}
            disabled={settingsLoading}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="COACH">Coach</option>
            <option value="EMPLOYEE">Employee</option>
            <option value="FREELANCER">Freelancer</option>
          </select>
        </div>
      </div>

      {/* ── Class Log Penalties ───────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Class Log Penalties (Month-wise)</h4>
        {Object.keys(groupedPenalties).length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No penalties recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedPenalties).map(([month, monthLogs]) => (
              <div key={month} className="border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  <h5 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{month}</h5>
                </div>
                <div className="px-3">
                  {monthLogs.map(log => (
                    <div key={log.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{fmt(log.date)} — {log.batch?.name ?? ""}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{log.penaltyNote || "Penalty applied"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {waivedIds.has(log.id) && <Badge variant="neutral" className="text-xs">Waived</Badge>}
                        <span className={`font-semibold text-sm ${waivedIds.has(log.id) ? "line-through text-slate-400" : "text-rose-600"}`}>
                          −₹{log.penaltyAmount}
                        </span>
                        <button
                          onClick={() => openPenaltyModal(log)}
                          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-600 rounded-md transition-colors border border-slate-200"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold pt-1">
              <span className="text-slate-600">Net penalties deducted (All-time)</span>
              <span className="text-rose-700">−₹{netPenalties}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Payout Rate Table ────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Per-Session Payout Rates — click cell to edit</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-slate-200 rounded-md">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 w-32">Level</th>
                {DURATIONS.map(d => (
                  <th key={d} className="px-3 py-2 font-semibold text-slate-600 text-center">{d} min</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEVELS.map(level => (
                <tr key={level} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-700">{LEVEL_LABELS[level]}</td>
                  {DURATIONS.map(dur => {
                    const rate = rates.find(r => r.level === level && r.durationMins === dur);
                    const isEditing = editingRate?.level === level && editingRate?.dur === dur;
                    return (
                      <td key={dur} className="px-2 py-1.5 text-center">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              autoFocus
                              value={editingRate.val}
                              onChange={e => setEditingRate(prev => prev ? { ...prev, val: e.target.value } : null)}
                              onKeyDown={e => {
                                if (e.key === "Enter") saveRate(level, dur, editingRate.val);
                                if (e.key === "Escape") setEditingRate(null);
                              }}
                              className="w-16 text-xs border border-blue-400 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => saveRate(level, dur, editingRate.val)}
                              disabled={rateSaving}
                              className="text-xs px-1 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >✓</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingRate({ level, dur, val: rate ? String(rate.ratePerSession) : "" })}
                            className="w-full text-center text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded py-1 transition-colors"
                            title="Click to edit"
                          >
                            {rate ? `₹${rate.ratePerSession}` : <span className="text-slate-300">—</span>}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-1">Click any cell to edit. Press Enter to save, Escape to cancel.</p>
      </div>

      {/* ── Adjustments ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700">Adjustments (Bonus / Deduction)</h4>
          <button
            onClick={() => setAdjModal(true)}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            + Add
          </button>
        </div>
        {adjustments.length === 0 ? (
          <p className="text-sm text-slate-400">No adjustments yet.</p>
        ) : (
          <div className="space-y-2">
            {adjustments.map(adj => (
              <div key={adj.id} className="flex justify-between items-start text-sm py-2 border-b border-slate-100 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase ${ADJ_COLORS[adj.type] ?? "text-slate-600"}`}>{adj.type}</span>
                    {adj.month && <span className="text-xs text-slate-400">{adj.month}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{adj.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${adj.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {adj.amount >= 0 ? "+" : ""}₹{adj.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => deleteAdjustment(adj.id)}
                    className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                    title="Remove"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal: Add Adjustment ─────────────────────────────────────────── */}
      {adjModal && (
        <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setAdjModal(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-lg text-slate-900">Add Adjustment</h3>
              <button onClick={() => setAdjModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Type</label>
                  <select value={adjForm.type} onChange={e => setAdjForm(p => ({ ...p, type: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="BONUS">Bonus</option>
                    <option value="INCENTIVE">Incentive</option>
                    <option value="DEDUCTION">Deduction</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Month</label>
                  <input type="month" value={adjForm.month} onChange={e => setAdjForm(p => ({ ...p, month: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Amount (₹) — use negative for deduction</label>
                <input type="number" value={adjForm.amount} onChange={e => setAdjForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 500 or -200" className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Reason *</label>
                <textarea value={adjForm.reason} onChange={e => setAdjForm(p => ({ ...p, reason: e.target.value }))} placeholder="Short note about this adjustment..." rows={2} className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              {adjError && <p className="text-red-600 text-xs">{adjError}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setAdjModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-4 py-2.5 text-sm font-semibold">Cancel</button>
                <button onClick={submitAdjustment} disabled={adjLoading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{adjLoading ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Penalty ───────────────────────────────────────────── */}
      {penaltyModal && (
        <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setPenaltyModal(null); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-lg text-slate-900">Edit Penalty</h3>
              <button onClick={() => setPenaltyModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <p className="text-xs text-slate-500 mb-4">{fmt(penaltyModal.date)} — {penaltyModal.batch?.name ?? ""}</p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Penalty Amount (₹)</label>
                <input type="number" value={penaltyForm.amount} onChange={e => setPenaltyForm(p => ({ ...p, amount: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Note</label>
                <input value={penaltyForm.note} onChange={e => setPenaltyForm(p => ({ ...p, note: e.target.value }))} placeholder="Reason or note…" className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={penaltyForm.waived} onChange={e => setPenaltyForm(p => ({ ...p, waived: e.target.checked }))} className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm text-slate-700">Waive this penalty (keep record, don&apos;t deduct)</span>
              </label>
              <div className="flex gap-2 justify-end mt-1">
                <button onClick={() => setPenaltyModal(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-4 py-2.5 text-sm font-semibold">Cancel</button>
                <button onClick={savePenalty} disabled={penaltyLoading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{penaltyLoading ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

