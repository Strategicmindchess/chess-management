"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeeCycleRow {
  id: string;
  feeConfigId: string;
  dueDate: string | null;
  classes: number | null;
  amount: number;
  status: "PAID" | "UNPAID" | "WAIVED";
  paidDate: string | null;
  batchCode: string | null;
  batchName: string | null;
  notes: string | null;
  isHidden?: boolean;
  createdAt: string;
}

export interface FeeConfigRow {
  id: string;
  studentProfileId: string;
  feeType: "MONTHLY" | "BATCH_BASED";
  feeAmount: number;
  classesPerCycle: number;
  frequency: string;
  startDate: string | null;
  feeStartDate: string | null;
  notes: string | null;
  cycles: FeeCycleRow[];
  student: {
    id: string;
    city: string | null;
    level: string | null;
    enrollments: { batch: { id: string; code: string; name: string; type: string } }[];
    assignedCoach: { user: { name: string } } | null;
    user: { id: string; name: string; phone: string | null; email: string };
  };
}

export interface AvailableStudent {
  userId: string;
  profileId: string;
  name: string;
  phone: string;
  city: string;
  level: string | null;
  coach: string | null;
  batches: { id: string; code: string; name: string; type: string }[];
}

export interface AvailableBatch {
  id: string;
  code: string;
  name: string;
  coachName: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};

const shiftMonthKey = (key: string, delta: number) => {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const safeSlice = (d: string | Date | null | undefined, length: number) => {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString().slice(0, length);
  return d.slice(0, length);
};

const fmtDate = (d: string | Date | null) => {
  if (!d) return "—";
  if (d instanceof Date) {
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  return new Date(d + (d.includes("T") ? "" : "T00:00:00"))
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const FREQ_LABELS: Record<string, string> = {
  CLASS_WISE: "Class-wise", WEEKLY: "Weekly", MONTHLY: "Monthly",
  QUARTERLY: "Quarterly", HALF_YEARLY: "Half-yearly", YEARLY: "Yearly",
};

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Beginner", CORE_1: "Core 1", CORE_2: "Core 2", CORE_3: "Core 3",
  CORE_4: "Core 4", INTERMEDIATE_1: "Int. 1", INTERMEDIATE_2: "Int. 2",
  INTERMEDIATE_3: "Int. 3", ADVANCE_1: "Advance 1", ADVANCE_2: "Advance 2",
  ELITE: "Elite",
};

const getActiveCycle = (cycles: FeeCycleRow[], period: string) => {
  if (!cycles.length) return null;
  if (period === "All") return cycles.find((cy) => cy.status !== "PAID") || cycles[cycles.length - 1];
  
  // Find cycle due in this period
  const dueInPeriod = cycles.find(cy => safeSlice(cy.dueDate, 7) === period);
  if (dueInPeriod) return dueInPeriod;
  
  // Fallback: find cycle paid in this period
  const paidInPeriod = cycles.find(cy => cy.status === "PAID" && safeSlice(cy.paidDate, 7) === period);
  if (paidInPeriod) return paidInPeriod;
  
  return null;
};

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  initialConfigs: FeeConfigRow[];
  availableStudents: AvailableStudent[];
  availableBatches: AvailableBatch[];
}

export function FeesLedger({ initialConfigs, availableStudents, availableBatches }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [configs, setConfigs] = useState<FeeConfigRow[]>(initialConfigs);

  // Keep configs in sync if server component re-fetches
  useEffect(() => {
    setConfigs(initialConfigs);
  }, [initialConfigs]);

  const [period, setPeriod] = useState(monthKey(new Date()));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [filterCoach, setFilterCoach] = useState("All");
  const [filterMode, setFilterMode] = useState("All");
  const [filterFeeType, setFilterFeeType] = useState("All");

  // ── Modal state ───────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FeeConfigRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeConfigRow | null>(null);
  const [addCycleTarget, setAddCycleTarget] = useState<FeeConfigRow | null>(null);

  // ── Derived: unique coaches ───────────────────────────────────────────────
  const coaches = useMemo(
    () => ["All", ...new Set(configs.map((c) => c.student.assignedCoach?.user.name).filter(Boolean) as string[])],
    [configs]
  );

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return configs
      .map(c => ({ ...c, cycles: c.cycles.filter(cy => cy.status !== "WAIVED") }))
      .filter((c) => {
        const s = c.student;
        if (filterCoach !== "All" && s.assignedCoach?.user.name !== filterCoach) return false;
        if (filterMode !== "All" && (s.enrollments[0]?.batch.type ?? "") !== filterMode) return false;
        if (filterFeeType !== "All" && c.feeType !== filterFeeType) return false;
        if (q && !`${s.user.name} ${s.city} ${s.user.phone}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.student.user.name.localeCompare(b.student.user.name));
  }, [configs, search, filterCoach, filterMode, filterFeeType]);

  // ── Summary cards ─────────────────────────────────────────────────────────
  const { paid, unpaid, revenue } = useMemo(() => {
    let paid = 0, unpaid = 0, revenue = 0;
    filtered.forEach((c) => {
      const active = getActiveCycle(c.cycles, period);
      if (active?.status === "PAID") paid++; else unpaid++;
      c.cycles.forEach((cy) => {
        if (cy.status === "PAID" && safeSlice(cy.paidDate, 7) === period) {
          revenue += cy.amount;
        }
      });
    });
    return { paid, unpaid, revenue };
  }, [filtered, period]);

  // ── API helpers (optimistic) ──────────────────────────────────────────────
  async function toggleCycleStatus(configId: string, cycle: FeeCycleRow) {
    const newStatus = cycle.status === "PAID" ? "UNPAID" : "PAID";
    const newPaidDate = newStatus === "PAID" ? todayStr() : null;
    const prevConfigs = configs;
    setConfigs((prev) =>
      prev.map((c) =>
        c.id !== configId ? c : {
          ...c,
          cycles: c.cycles.map((cy) =>
            cy.id !== cycle.id ? cy : { ...cy, status: newStatus, paidDate: newPaidDate }
          ),
        }
      )
    );
    try {
      const res = await fetch(`/api/fees/${configId}/cycles?cycleId=${cycle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, paidDate: newPaidDate }),
      });
      if (!res.ok) {
        setConfigs(prevConfigs);
        alert("Failed to update status.");
      }
    } catch {
      setConfigs(prevConfigs);
      alert("Network error.");
    }
    startTransition(() => router.refresh());
  }

  async function deleteCycleById(configId: string, cycleId: string) {
    if (!confirm("Remove this cycle completely?")) return;
    const prevConfigs = configs;
    setConfigs((prev) =>
      prev.map((c) =>
        c.id !== configId ? c : { ...c, cycles: c.cycles.map(cy => cy.id === cycleId ? { ...cy, status: "WAIVED" } : cy) }
      )
    );
    try {
      const res = await fetch(`/api/fees/${configId}/cycles?cycleId=${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "WAIVED" }),
      });
      if (!res.ok) {
        setConfigs(prevConfigs);
        alert("Failed to remove cycle.");
      }
    } catch {
      setConfigs(prevConfigs);
      alert("Network error.");
    }
    startTransition(() => router.refresh());
  }

  async function hideCycleById(configId: string, cycleId: string) {
    const prevConfigs = configs;
    setConfigs((prev) =>
      prev.map((c) =>
        c.id !== configId ? c : { ...c, cycles: c.cycles.map(cy => cy.id === cycleId ? { ...cy, isHidden: true } : cy) }
      )
    );
    try {
      const res = await fetch(`/api/fees/${configId}/cycles?cycleId=${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: true }),
      });
      if (!res.ok) {
        setConfigs(prevConfigs);
        alert("Failed to hide cycle.");
      }
    } catch {
      setConfigs(prevConfigs);
      alert("Network error.");
    }
    startTransition(() => router.refresh());
  }

  async function updateCycleField(configId: string, cycleId: string, payload: any) {
    try {
      const res = await fetch(`/api/fees/${configId}/cycles?cycleId=${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        alert("Failed to update field. Reverting changes.");
        startTransition(() => router.refresh());
      }
    } catch {
      alert("Network error. Failed to update field.");
      startTransition(() => router.refresh());
    }
  }

  async function deleteConfig(configId: string) {
    setConfigs((prev) => prev.filter((c) => c.id !== configId));
    await fetch(`/api/fees/${configId}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  // ── Add Student form state ────────────────────────────────────────────────
  const [addForm, setAddForm] = useState({
    profileId: "", feeType: "MONTHLY" as "MONTHLY" | "BATCH_BASED",
    feeAmount: "", classesPerCycle: "8", frequency: "MONTHLY",
    startDate: "", feeStartDate: "", notes: "",
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  async function submitAdd() {
    if (!addForm.profileId) { setAddError("Please select a student."); return; }
    setAddError(null);
    setAddLoading(true);
    const res = await fetch("/api/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentProfileId: addForm.profileId,
        feeType: addForm.feeType,
        feeAmount: Number(addForm.feeAmount) || 0,
        classesPerCycle: Number(addForm.classesPerCycle) || 8,
        frequency: addForm.frequency,
        startDate: addForm.startDate || null,
        feeStartDate: addForm.feeStartDate || null,
        notes: addForm.notes || null,
      }),
    });
    setAddLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setAddError(d.error ?? "Failed to add student.");
      return;
    }
    setAddOpen(false);
    startTransition(() => router.refresh());
  }

  // ── Edit form state ───────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({
    feeType: "MONTHLY" as "MONTHLY" | "BATCH_BASED",
    feeAmount: "", classesPerCycle: "8", frequency: "MONTHLY",
    startDate: "", feeStartDate: "", notes: "", batchId: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  function openEdit(c: FeeConfigRow) {
    setEditForm({
      feeType: c.feeType,
      feeAmount: String(c.feeAmount),
      classesPerCycle: String(c.classesPerCycle),
      frequency: c.frequency,
      startDate: safeSlice(c.startDate, 10) ?? "",
      feeStartDate: safeSlice(c.feeStartDate, 10) ?? "",
      notes: c.notes ?? "",
      batchId: c.student.enrollments[0]?.batch.id ?? "",
    });
    setEditTarget(c);
    setEditError(null);
  }

  async function submitEdit() {
    if (!editTarget) return;
    setEditError(null);
    setEditLoading(true);
    const res = await fetch(`/api/fees/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeType: editForm.feeType,
        feeAmount: Number(editForm.feeAmount) || 0,
        classesPerCycle: Number(editForm.classesPerCycle) || 8,
        frequency: editForm.frequency,
        startDate: editForm.startDate || null,
        feeStartDate: editForm.feeStartDate || null,
        notes: editForm.notes || null,
        batchId: editForm.batchId || null,
      }),
    });
    setEditLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setEditError(d.error ?? "Failed to update.");
      return;
    }
    setEditTarget(null);
    startTransition(() => router.refresh());
  }

  // ── Add Cycle form ────────────────────────────────────────────────────────
  const [cycleForm, setCycleForm] = useState({
    dueDate: "", classes: "", amount: "", batchCode: "", batchName: "", notes: "",
  });
  const [cycleError, setCycleError] = useState<string | null>(null);
  const [cycleLoading, setCycleLoading] = useState(false);

  function openAddCycle(c: FeeConfigRow) {
    setCycleForm({ dueDate: "", classes: "", amount: String(c.feeAmount || ""), batchCode: "", batchName: "", notes: "" });
    setCycleError(null);
    setAddCycleTarget(c);
  }

  async function submitCycle() {
    if (!addCycleTarget) return;
    setCycleError(null);
    setCycleLoading(true);
    const isBatch = addCycleTarget.feeType === "BATCH_BASED";
    const res = await fetch(`/api/fees/${addCycleTarget.id}/cycles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dueDate: isBatch ? null : (cycleForm.dueDate || null),
        classes: isBatch ? null : (Number(cycleForm.classes) || null),
        amount: Number(cycleForm.amount) || 0,
        batchCode: isBatch ? (cycleForm.batchCode || null) : null,
        batchName: isBatch ? (cycleForm.batchName || null) : null,
        notes: cycleForm.notes || null,
      }),
    });
    setCycleLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setCycleError(d.error ?? "Failed to add cycle.");
      return;
    }
    setAddCycleTarget(null);
    startTransition(() => router.refresh());
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative font-sans text-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center pb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-serif font-semibold text-xl tracking-tight">Student Ledger</div>
            <div className="text-xs text-gray-500">Roster &amp; fee tracking</div>
          </div>
        </div>
        <button onClick={() => { setAddForm({ profileId: "", feeType: "MONTHLY", feeAmount: "", classesPerCycle: "8", frequency: "MONTHLY", startDate: "", feeStartDate: "", notes: "" }); setAddError(null); setAddOpen(true); }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer transition-colors shadow-sm">
          + Add student
        </button>
      </div>

      {/* Period Bar */}
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <button onClick={() => setPeriod(shiftMonthKey(period, -1))} className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer flex items-center justify-center text-lg text-gray-600">‹</button>
        <span className="font-mono text-sm font-medium min-w-[90px] text-center text-gray-700">{monthLabel(period)}</span>
        <button onClick={() => setPeriod(shiftMonthKey(period, 1))} className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer flex items-center justify-center text-lg text-gray-600">›</button>
        {period !== monthKey(new Date()) && (
          <button onClick={() => setPeriod(monthKey(new Date()))} className="text-xs text-blue-600 bg-transparent border-none cursor-pointer font-semibold underline hover:text-blue-800 ml-2">Today</button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4 relative z-10">
        {[
          { label: "Students", value: filtered.length, color: "text-gray-900" },
          { label: "Paid", value: paid, color: "text-green-600" },
          { label: "Unpaid", value: unpaid, color: "text-red-600" },
          { label: "Collected", value: `₹${revenue.toLocaleString("en-IN")}`, color: "text-amber-600" },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <div className={`font-serif text-lg font-semibold ${card.color}`}>{card.value}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider font-medium">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap mb-4 relative z-10">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-[160px] shadow-sm">
          <span className="text-gray-400">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, city, phone…" className="border-none outline-none text-sm bg-transparent flex-1 text-gray-900 placeholder-gray-400 w-full" />
        </div>
        <select value={filterCoach} onChange={(e) => setFilterCoach(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm">
          {coaches.map((c) => <option key={c} value={c}>{c === "All" ? "All coaches" : c}</option>)}
        </select>
        <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm">
          <option value="All">All modes</option>
          <option value="GROUP_SESSION">Group</option>
          <option value="ONE_ON_ONE_SESSION">1-on-1</option>
        </select>
        <select value={filterFeeType} onChange={(e) => setFilterFeeType(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm">
          <option value="All">All fee types</option>
          <option value="MONTHLY">Monthly</option>
          <option value="BATCH_BASED">Batch-based</option>
        </select>
      </div>

      {/* Student Cards */}
      <div className="flex flex-col gap-3 relative z-10">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-10">
            {configs.length === 0 ? "No students added yet. Click '+ Add student' to get started." : "No students match this filter."}
          </div>
        ) : filtered.map((c) => {
          const s = c.student;
          const isOpen = !!expanded[c.id];
          const active = getActiveCycle(c.cycles, period);
          const status = active?.status ?? "UNPAID";
          const overdue = active?.status === "UNPAID" && active.dueDate && active.dueDate < todayStr();
          const batchCode = s.enrollments[0]?.batch.code ?? null;
          const coachName = s.assignedCoach?.user.name ?? null;
          const isBatch = c.feeType === "BATCH_BASED";

          return (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Card header */}
              <div onClick={() => setExpanded((p) => ({ ...p, [c.id]: !p[c.id] }))} className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-900 flex items-center justify-center font-serif font-bold text-lg shrink-0">
                    {(s.user.name.trim().charAt(0) || "?").toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{s.user.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {batchCode ? `Batch ${batchCode} • ` : ""}
                      {s.level ? `${LEVEL_LABELS[s.level] ?? s.level} • ` : ""}
                      {coachName ? `Coach ${coachName} • ` : ""}
                      <span className={`font-semibold ${isBatch ? "text-amber-600" : "text-blue-600"}`}>{isBatch ? "Batch-based" : "Monthly"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); if (active) toggleCycleStatus(c.id, active); }}
                    className={`border-none rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${status === "PAID" ? "bg-green-100 text-green-700 hover:bg-green-200" : status === "WAIVED" ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : overdue ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}>
                    {status === "PAID" ? "Paid" : status === "WAIVED" ? "Waived" : overdue ? "Overdue" : "Unpaid"}
                  </button>
                  <span className={`text-gray-400 text-sm transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▼</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {[
                      { icon: "📞", label: "Phone", val: s.user.phone || "—" },
                      { icon: "📍", label: "City", val: s.city || "—" },
                      { icon: "🔖", label: "Batch code", val: batchCode || "—" },
                      { icon: "♟", label: "Level", val: s.level ? (LEVEL_LABELS[s.level] ?? s.level) : "—" },
                      { icon: "₹", label: "Default fee", val: c.feeAmount ? `₹${c.feeAmount.toLocaleString("en-IN")}` : "—" },
                      { icon: "🔁", label: isBatch ? "Fee type" : "Frequency", val: isBatch ? "Batch-based" : (FREQ_LABELS[c.frequency] ?? c.frequency) },
                      ...(c.startDate ? [{ icon: "📅", label: "Start date", val: fmtDate(c.startDate) }] : []),
                      ...(c.feeStartDate ? [{ icon: "📅", label: "Fee start date", val: fmtDate(c.feeStartDate) }] : []),
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">{row.icon} {row.label}</div>
                        <div className="text-sm font-medium text-gray-900">{row.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Cycles */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {isBatch ? "Batch payment cycles" : "Fee cycles"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mb-3">
                    {c.cycles.filter((cy) => !cy.isHidden).length === 0 ? (
                      <div className="text-center text-gray-500 text-sm py-3">No active cycles.</div>
                    ) : c.cycles.filter((cy) => !cy.isHidden).map((cy, idx) => {
                      const isActiveCy = active?.id === cy.id;
                      const cyOverdue = cy.status === "UNPAID" && cy.dueDate && cy.dueDate < todayStr();
                      return (
                        <div key={cy.id} className={`border rounded-xl p-3 bg-white transition-shadow ${isActiveCy ? "border-amber-400 ring-1 ring-amber-400" : "border-gray-200"}`}>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-semibold text-gray-500">
                              {isBatch ? `Batch Cycle ${idx + 1}` : `Cycle ${idx + 1}`}
                            </span>
                            <button onClick={() => toggleCycleStatus(c.id, cy)}
                              className={`border-none rounded-full px-3 py-1 text-xs font-bold cursor-pointer transition-colors ${cy.status === "PAID" ? "bg-green-100 text-green-700 hover:bg-green-200" : cy.status === "WAIVED" ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
                              {cy.status === "PAID" ? "Paid" : cy.status === "WAIVED" ? "Waived" : "Unpaid"}
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            {isBatch ? (
                              <>
                                <label className="flex flex-col gap-1 text-[10px] text-gray-500">
                                  <span>Batch code</span>
                                  <input type="text" defaultValue={cy.batchCode ?? ""} onBlur={(e) => updateCycleField(c.id, cy.id, { batchCode: e.target.value || null })} className="border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none w-full" />
                                </label>
                                <label className="flex flex-col gap-1 text-[10px] text-gray-500 col-span-2">
                                  <span>Batch name</span>
                                  <input type="text" defaultValue={cy.batchName ?? ""} onBlur={(e) => updateCycleField(c.id, cy.id, { batchName: e.target.value || null })} className="border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none w-full" />
                                </label>
                              </>
                            ) : (
                              <>
                                <label className="flex flex-col gap-1 text-[10px] text-gray-500">
                                  <span>Due date {cyOverdue ? "⚠️" : ""}</span>
                                  <input type="date" defaultValue={safeSlice(cy.dueDate, 10) ?? ""} onBlur={(e) => updateCycleField(c.id, cy.id, { dueDate: e.target.value || null })} className="border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none w-full" />
                                </label>
                                <label className="flex flex-col gap-1 text-[10px] text-gray-500">
                                  <span>Classes</span>
                                  <input type="number" defaultValue={cy.classes ?? ""} onBlur={(e) => updateCycleField(c.id, cy.id, { classes: Number(e.target.value) || null })} className="border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none w-full" />
                                </label>
                              </>
                            )}
                            <label className="flex flex-col gap-1 text-[10px] text-gray-500">
                              <span>Amount (₹)</span>
                              <input type="number" defaultValue={cy.amount} onBlur={(e) => updateCycleField(c.id, cy.id, { amount: Number(e.target.value) || 0 })} className="border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none w-full" />
                            </label>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-gray-500">
                              {cy.status === "PAID" ? `Paid on ${fmtDate(cy.paidDate)}` : cy.dueDate ? `Due ${fmtDate(cy.dueDate)}` : isBatch ? "Due on batch completion" : "No due date set"}
                            </span>
                            <div className="flex gap-2">
                              <button onClick={() => hideCycleById(c.id, cy.id)} className="bg-transparent border-none text-gray-500 hover:text-gray-700 text-[11px] font-semibold cursor-pointer">Hide</button>
                              <button onClick={() => deleteCycleById(c.id, cy.id)} className="bg-transparent border-none text-red-600 text-[11px] font-semibold cursor-pointer hover:text-red-800">Remove</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => openAddCycle(c)} className="w-full bg-white border border-dashed border-gray-300 rounded-lg py-2.5 text-xs font-semibold text-gray-600 cursor-pointer mb-4 hover:bg-gray-50 transition-colors">
                    + Add {isBatch ? "batch" : ""} cycle
                  </button>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(c)} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm cursor-pointer transition-colors">✎ Edit</button>
                    <button onClick={() => setDeleteTarget(c)} className="flex items-center gap-1.5 bg-white border border-red-200 rounded-md px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 shadow-sm cursor-pointer transition-colors">🗑 Delete</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal: Add Student ─────────────────────────────────────────────── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add student to ledger">
        <div className="flex flex-col gap-4">
          <Field label="Student *">
            <SearchableStudentSelect
              value={addForm.profileId}
              onChange={(profileId) => {
                const stu = availableStudents.find((s) => s.profileId === profileId);
                setAddForm((p) => ({ ...p, profileId, feeAmount: stu ? "" : p.feeAmount }));
              }}
              options={availableStudents}
            />
            {addForm.profileId && (() => {
              const selectedStu = availableStudents.find((s) => s.profileId === addForm.profileId);
              if (selectedStu) {
                return (
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg mt-1 flex flex-col gap-2">
                    <div className="text-sm font-semibold text-gray-900">{selectedStu.name}</div>
                    {selectedStu.phone && <div className="text-xs text-gray-600 flex items-center gap-2">📞 {selectedStu.phone}</div>}
                    {selectedStu.coach && <div className="text-xs text-gray-600 flex items-center gap-2">👨‍🏫 Coach: {selectedStu.coach}</div>}
                    {selectedStu.level && <div className="text-xs text-gray-600 flex items-center gap-2">⭐ Level: {selectedStu.level}</div>}
                    {selectedStu.batches.length > 0 && (
                      <div className="text-xs text-gray-600 flex items-start gap-2">
                        🏫 <div>Batches:<br/><span className="font-medium">{selectedStu.batches.map(b => `${b.name} (${b.code})`).join(', ')}</span></div>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fee type">
              <select value={addForm.feeType} onChange={(e) => setAddForm((p) => ({ ...p, feeType: e.target.value as "MONTHLY" | "BATCH_BASED" }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white">
                <option value="MONTHLY">Monthly-based</option>
                <option value="BATCH_BASED">Batch-based</option>
              </select>
            </Field>
            <Field label="Default fee (₹)">
              <input type="number" value={addForm.feeAmount} onChange={(e) => setAddForm((p) => ({ ...p, feeAmount: e.target.value }))} placeholder="2000" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
            </Field>
            {addForm.feeType === "MONTHLY" && (
              <>
                <Field label="Frequency">
                  <select value={addForm.frequency} onChange={(e) => setAddForm((p) => ({ ...p, frequency: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white">
                    {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Classes / cycle">
                  <input type="number" value={addForm.classesPerCycle} onChange={(e) => setAddForm((p) => ({ ...p, classesPerCycle: e.target.value }))} placeholder="8" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
                </Field>
                <Field label="Fee start date">
                  <input type="date" value={addForm.feeStartDate} onChange={(e) => setAddForm((p) => ({ ...p, feeStartDate: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
                </Field>
              </>
            )}
            <Field label="Start date">
              <input type="date" value={addForm.startDate} onChange={(e) => setAddForm((p) => ({ ...p, startDate: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
            </Field>
          </div>
          <Field label="Notes (optional)">
            <input value={addForm.notes} onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any notes…" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
          </Field>
          {addError && <p className="text-red-600 text-xs">{addError}</p>}
          <div className="flex gap-2 justify-end mt-2">
            <button onClick={() => setAddOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-none rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors">Cancel</button>
            <button onClick={submitAdd} disabled={addLoading} className="bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{addLoading ? "Adding…" : "Add student"}</button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Edit ───────────────────────────────────────────────────── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget?.student.user.name ?? ""}`}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fee type">
              <select value={editForm.feeType} onChange={(e) => setEditForm((p) => ({ ...p, feeType: e.target.value as "MONTHLY" | "BATCH_BASED" }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white">
                <option value="MONTHLY">Monthly-based</option>
                <option value="BATCH_BASED">Batch-based</option>
              </select>
            </Field>
            <Field label="Default fee (₹)">
              <input type="number" value={editForm.feeAmount} onChange={(e) => setEditForm((p) => ({ ...p, feeAmount: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
            </Field>
            {editForm.feeType === "MONTHLY" && (
              <>
                <Field label="Frequency">
                  <select value={editForm.frequency} onChange={(e) => setEditForm((p) => ({ ...p, frequency: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white">
                    {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Classes / cycle">
                  <input type="number" value={editForm.classesPerCycle} onChange={(e) => setEditForm((p) => ({ ...p, classesPerCycle: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
                </Field>
                <Field label="Fee start date">
                  <input type="date" value={editForm.feeStartDate} onChange={(e) => setEditForm((p) => ({ ...p, feeStartDate: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
                </Field>
              </>
            )}
            <Field label="Start date">
              <input type="date" value={editForm.startDate} onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
            </Field>
          </div>
          <Field label="Assigned Batch">
            <select value={editForm.batchId} onChange={(e) => setEditForm((p) => ({ ...p, batchId: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white">
              <option value="">No Batch Assigned</option>
              {availableBatches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </Field>
          <Field label="Notes (optional)">
            <input value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
          </Field>
          {editError && <p className="text-red-600 text-xs">{editError}</p>}
          <div className="flex gap-2 justify-end mt-2">
            <button onClick={() => setEditTarget(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-none rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors">Cancel</button>
            <button onClick={submitEdit} disabled={editLoading} className="bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{editLoading ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Add Cycle ──────────────────────────────────────────────── */}
      <Modal open={!!addCycleTarget} onClose={() => setAddCycleTarget(null)} title={`Add ${addCycleTarget?.feeType === "BATCH_BASED" ? "batch" : ""} cycle — ${addCycleTarget?.student.user.name ?? ""}`}>
        <div className="flex flex-col gap-4">
          {addCycleTarget?.feeType === "BATCH_BASED" ? (
            <div className="flex flex-col gap-4">
              <Field label="Batch">
                <SearchableBatchSelect
                  value={cycleForm.batchCode}
                  onChange={(code, name) => {
                    setCycleForm((p) => ({ ...p, batchCode: code, batchName: name }));
                  }}
                  options={availableBatches}
                />
                {cycleForm.batchCode && (() => {
                  const selectedBatch = availableBatches.find((b) => b.code === cycleForm.batchCode);
                  if (selectedBatch && selectedBatch.coachName) {
                    return <div className="text-xs text-green-700 mt-1">👨‍🏫 Coach: {selectedBatch.coachName}</div>;
                  }
                  return null;
                })()}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Batch code">
                  <input type="text" value={cycleForm.batchCode} onChange={(e) => setCycleForm((p) => ({ ...p, batchCode: e.target.value }))} placeholder="e.g. B-14" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
                </Field>
                <Field label="Amount (₹) *">
                  <input type="number" value={cycleForm.amount} onChange={(e) => setCycleForm((p) => ({ ...p, amount: e.target.value }))} placeholder="2000" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
                </Field>
                <Field label="Batch name" style={{ gridColumn: "span 2" }}>
                  <input type="text" value={cycleForm.batchName} onChange={(e) => setCycleForm((p) => ({ ...p, batchName: e.target.value }))} placeholder="e.g. Core 2 Group A" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
                </Field>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <Field label="Due date">
                <input type="date" value={cycleForm.dueDate} onChange={(e) => setCycleForm((p) => ({ ...p, dueDate: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
              </Field>
              <Field label="Classes">
                <input type="number" value={cycleForm.classes} onChange={(e) => setCycleForm((p) => ({ ...p, classes: e.target.value }))} placeholder="8" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
              </Field>
              <Field label="Amount (₹) *">
                <input type="number" value={cycleForm.amount} onChange={(e) => setCycleForm((p) => ({ ...p, amount: e.target.value }))} placeholder="2000" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
              </Field>
            </div>
          )}
          <Field label="Notes (optional)">
            <input value={cycleForm.notes} onChange={(e) => setCycleForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any notes…" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white" />
          </Field>
          {cycleError && <p className="text-red-600 text-xs">{cycleError}</p>}
          <div className="flex gap-2 justify-end mt-2">
            <button onClick={() => setAddCycleTarget(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-none rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors">Cancel</button>
            <button onClick={submitCycle} disabled={cycleLoading} className="bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{cycleLoading ? "Adding…" : "Add cycle"}</button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Delete Confirm ─────────────────────────────────────────── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={`Remove ${deleteTarget?.student.user.name ?? ""}?`}>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          This removes their fee configuration and all payment cycles. Student account is not deleted.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteTarget(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-none rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors">Cancel</button>
          <button onClick={async () => { if (deleteTarget) { await deleteConfig(deleteTarget.id); setDeleteTarget(null); } }} className="bg-red-600 hover:bg-red-700 text-white border-none rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors">Delete</button>
        </div>
      </Modal>

      {isPending && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm z-[100] shadow-lg">Syncing…</div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-gray-900/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-5">
          <div className="font-serif font-semibold text-xl text-gray-900">{title}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer border-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="flex flex-col gap-1.5" style={style}>
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function SearchableStudentSelect({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (val: string) => void;
  options: AvailableStudent[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.profileId === value);

  const filtered = options.filter(o => 
    o.name.toLowerCase().includes(query.toLowerCase()) || 
    (o.phone && o.phone.includes(query)) ||
    (o.city && o.city.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search student..."
        value={open ? query : (selected ? `${selected.name} ${selected.phone ? `(${selected.phone})` : ''}` : query)}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white shadow-sm"
      />
      {open && (
        <div className="absolute top-full left-0 right-0 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg mt-1 z-50 shadow-lg">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No students found</div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.profileId}
                onMouseDown={(e) => { e.preventDefault(); onChange(s.profileId); setQuery(""); setOpen(false); }}
                className={`p-3 text-sm cursor-pointer border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors ${value === s.profileId ? "bg-gray-50 font-medium" : "bg-white"}`}
              >
                <div className="text-gray-900 font-medium">{s.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {s.phone ? `${s.phone}` : ""}
                  {s.city ? ` · ${s.city}` : ""}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SearchableBatchSelect({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (code: string, name: string) => void;
  options: AvailableBatch[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.code === value);

  const filtered = options.filter(o => 
    o.name.toLowerCase().includes(query.toLowerCase()) || 
    (o.code && o.code.toLowerCase().includes(query.toLowerCase())) ||
    (o.coachName && o.coachName.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search batch by name, code, or coach..."
        value={open ? query : (selected ? `${selected.name} (${selected.code})` : query)}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white shadow-sm"
      />
      {open && (
        <div className="absolute top-full left-0 right-0 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg mt-1 z-50 shadow-lg">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No batches found</div>
          ) : (
            filtered.map((b) => (
              <div
                key={b.id}
                onMouseDown={(e) => { e.preventDefault(); onChange(b.code, b.name); setQuery(""); setOpen(false); }}
                className={`p-3 text-sm cursor-pointer border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors ${value === b.code ? "bg-gray-50 font-medium" : "bg-white"}`}
              >
                <div className="text-gray-900 font-medium">{b.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Code: {b.code}
                  {b.coachName ? ` · Coach: ${b.coachName}` : ""}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
