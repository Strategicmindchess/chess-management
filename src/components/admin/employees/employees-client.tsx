"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type EmploymentMode = "EMPLOYEE" | "FREELANCER" | "EMPLOYER";
type EmployeeType = "FULL_TIME" | "PART_TIME";
type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE" | "HOLIDAY";

interface Employee {
  id: string; name: string; phone: string | null; email: string | null;
  jobRole: string; employeeType: EmployeeType; employmentMode: EmploymentMode;
  fixedSalary: number; projectRate: number; tdsApplicable: boolean;
  joiningDate: string | null; isActive: boolean; createdAt: string;
}

interface AttendanceRecord {
  id: string; date: string; status: AttendanceStatus;
  checkInTime: string | null; checkOutTime: string | null;
  workingHours: number | null; isOvertime: boolean;
  overtimeHours: number | null; overtimeBonus: number; notes: string | null;
}

interface Incentive {
  id: string; month: string; type: string; amount: number; reason: string;
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ABSENT: "bg-rose-100 text-rose-800 border-rose-200",
  HALF_DAY: "bg-amber-100 text-amber-800 border-amber-200",
  LEAVE: "bg-blue-100 text-blue-800 border-blue-200",
  HOLIDAY: "bg-purple-100 text-purple-800 border-purple-200",
};

const MODE_LABELS: Record<EmploymentMode, string> = {
  EMPLOYEE: "Employee", FREELANCER: "Freelancer", EMPLOYER: "Employer",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Add Employee Modal ────────────────────────────────────────────────────────
function AddEmployeeModal({ onClose, onAdded }: { onClose: () => void; onAdded: (e: Employee) => void }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", jobRole: "",
    employeeType: "FULL_TIME" as EmployeeType,
    employmentMode: "EMPLOYEE" as EmploymentMode,
    fixedSalary: "", projectRate: "", tdsApplicable: false, joiningDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!form.name || !form.jobRole) { setError("Name and Job Role are required"); return; }
    setLoading(true); setError(null);
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        fixedSalary: Number(form.fixedSalary) || 0,
        projectRate: Number(form.projectRate) || 0,
        joiningDate: form.joiningDate || null,
      }),
    });
    setLoading(false);
    if (!res.ok) { setError("Failed to create employee"); return; }
    const data = await res.json();
    onAdded(data.employee);
    onClose();
  }

  const inp = "border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full";

  return (
    <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-semibold text-xl text-slate-900">Add Employee / Freelancer</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Full Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} placeholder="e.g. Rahul Sharma" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Phone</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inp} placeholder="+91..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inp} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Job Role *</label>
            <input value={form.jobRole} onChange={e => setForm(p => ({ ...p, jobRole: e.target.value }))} className={inp} placeholder="e.g. Operations Manager" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Mode</label>
            <select value={form.employmentMode} onChange={e => setForm(p => ({ ...p, employmentMode: e.target.value as EmploymentMode }))} className={inp}>
              <option value="EMPLOYEE">Employee</option>
              <option value="FREELANCER">Freelancer</option>
              <option value="EMPLOYER">Employer</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Type</label>
            <select value={form.employeeType} onChange={e => setForm(p => ({ ...p, employeeType: e.target.value as EmployeeType }))} className={inp}>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Fixed Salary (₹/month)</label>
            <input type="number" value={form.fixedSalary} onChange={e => setForm(p => ({ ...p, fixedSalary: e.target.value }))} className={inp} placeholder="0" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Project Rate (₹/project)</label>
            <input type="number" value={form.projectRate} onChange={e => setForm(p => ({ ...p, projectRate: e.target.value }))} className={inp} placeholder="0" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Joining Date</label>
            <input type="date" value={form.joiningDate} onChange={e => setForm(p => ({ ...p, joiningDate: e.target.value }))} className={inp} />
          </div>
          <div className="flex items-center gap-3 pt-4">
            <input type="checkbox" id="tds-emp" checked={form.tdsApplicable} onChange={e => setForm(p => ({ ...p, tdsApplicable: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="tds-emp" className="text-sm text-slate-700 cursor-pointer">TDS 10% applicable</label>
          </div>
        </div>
        {error && <p className="text-rose-600 text-xs mt-3">{error}</p>}
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-4 py-2.5 text-sm font-semibold">Cancel</button>
          <button onClick={submit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
            {loading ? "Adding…" : "Add Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Attendance Modal ──────────────────────────────────────────────────────────
function AttendanceModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: todayStr(), status: "PRESENT" as AttendanceStatus,
    checkInTime: "09:00", checkOutTime: "18:00",
    isOvertime: false, overtimeHours: "", overtimeBonus: "", notes: "",
  });

  async function loadRecords(m: string) {
    setLoading(true);
    const res = await fetch(`/api/employees/${employee.id}/attendance?month=${m}`);
    const data = await res.json();
    setRecords(data.records || []);
    setLoading(false);
  }

  // Load on mount
  useState(() => { loadRecords(month); });

  async function markAttendance() {
    setSaving("mark");
    const res = await fetch(`/api/employees/${employee.id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        overtimeHours: form.isOvertime ? Number(form.overtimeHours) : null,
        overtimeBonus: form.isOvertime ? Number(form.overtimeBonus) : 0,
        notes: form.notes || null,
      }),
    });
    setSaving(null);
    if (res.ok) {
      const data = await res.json();
      setRecords(prev => {
        const existing = prev.findIndex(r => r.date.slice(0, 10) === form.date);
        if (existing >= 0) { const u = [...prev]; u[existing] = data.record; return u; }
        return [...prev, data.record].sort((a, b) => a.date.localeCompare(b.date));
      });
    }
  }

  // Summary stats
  const present = records.filter(r => r.status === "PRESENT").length;
  const absent = records.filter(r => r.status === "ABSENT").length;
  const halfDay = records.filter(r => r.status === "HALF_DAY").length;
  const totalOvertimeBonus = records.reduce((acc, r) => acc + r.overtimeBonus, 0);

  const inp = "border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full";

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-xl text-slate-900">{employee.name}</h3>
            <p className="text-sm text-slate-500">{employee.jobRole} · {MODE_LABELS[employee.employmentMode]}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Month Picker */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700">Month:</label>
            <input type="month" value={month}
              onChange={e => { setMonth(e.target.value); loadRecords(e.target.value); }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Present", val: present, color: "text-emerald-700 bg-emerald-50" },
              { label: "Absent", val: absent, color: "text-rose-700 bg-rose-50" },
              { label: "Half Day", val: halfDay, color: "text-amber-700 bg-amber-50" },
              { label: "OT Bonus", val: `₹${totalOvertimeBonus}`, color: "text-blue-700 bg-blue-50" },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                <p className="text-lg font-bold">{s.val}</p>
                <p className="text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Mark Attendance Form */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Mark / Update Attendance</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inp} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as AttendanceStatus }))} className={inp}>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="LEAVE">Leave</option>
                  <option value="HOLIDAY">Holiday</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Check-In Time</label>
                <input type="time" value={form.checkInTime} onChange={e => setForm(p => ({ ...p, checkInTime: e.target.value }))} className={inp} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Check-Out Time</label>
                <input type="time" value={form.checkOutTime} onChange={e => setForm(p => ({ ...p, checkOutTime: e.target.value }))} className={inp} />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <input type="checkbox" id="ot" checked={form.isOvertime} onChange={e => setForm(p => ({ ...p, isOvertime: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                <label htmlFor="ot" className="text-sm text-slate-700 cursor-pointer">Overtime</label>
              </div>
              {form.isOvertime && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-600">OT Hours</label>
                    <input type="number" value={form.overtimeHours} onChange={e => setForm(p => ({ ...p, overtimeHours: e.target.value }))} className={inp} step="0.5" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-600">OT Bonus (₹)</label>
                    <input type="number" value={form.overtimeBonus} onChange={e => setForm(p => ({ ...p, overtimeBonus: e.target.value }))} className={inp} />
                  </div>
                </>
              )}
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Notes</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inp} placeholder="Optional note…" />
              </div>
            </div>
            <button onClick={markAttendance} disabled={saving === "mark"} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 w-full">
              {saving === "mark" ? "Saving…" : "Save Attendance"}
            </button>
          </div>

          {/* Attendance Records Table */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Attendance Register — {month}</h4>
            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : records.length === 0 ? (
              <p className="text-sm text-slate-400">No records for this month.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200 rounded-lg">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Date", "Status", "In", "Out", "Hrs", "OT", "OT Bonus", "Notes"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2">{new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[r.status]}`}>{r.status.replace("_", " ")}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{r.checkInTime || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{r.checkOutTime || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{r.workingHours ? r.workingHours.toFixed(1) : "—"}</td>
                        <td className="px-3 py-2">{r.isOvertime ? <span className="text-blue-600 font-semibold">{r.overtimeHours}h</span> : "—"}</td>
                        <td className="px-3 py-2">{r.overtimeBonus > 0 ? <span className="text-emerald-600 font-semibold">₹{r.overtimeBonus}</span> : "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{r.notes || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────
export function EmployeesClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [showAdd, setShowAdd] = useState(false);
  const [attendanceFor, setAttendanceFor] = useState<Employee | null>(null);
  const [filter, setFilter] = useState<"ALL" | EmploymentMode>("ALL");

  const filtered = filter === "ALL" ? employees : employees.filter(e => e.employmentMode === filter);
  const active = filtered.filter(e => e.isActive);
  const inactive = filtered.filter(e => !e.isActive);

  async function toggleActive(emp: Employee) {
    await fetch(`/api/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !emp.isActive }),
    });
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, isActive: !e.isActive } : e));
  }

  function EmployeeCard({ emp }: { emp: Employee }) {
    return (
      <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-3 ${!emp.isActive ? "opacity-60" : ""}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-sm">
                {emp.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{emp.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{emp.jobRole}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
              emp.employmentMode === "EMPLOYEE" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/30" :
              emp.employmentMode === "FREELANCER" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/30" :
              "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30"
            }`}>{emp.employmentMode}</span>
            {emp.tdsApplicable && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">TDS</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <span className="text-slate-400 dark:text-slate-500">Type: </span>
            <span className="dark:text-slate-300">{emp.employeeType === "FULL_TIME" ? "Full Time" : "Part Time"}</span>
          </div>
          {emp.fixedSalary > 0 && (
            <div><span className="text-slate-400 dark:text-slate-500">Salary: </span><span className="dark:text-slate-300">₹{emp.fixedSalary.toLocaleString()}/mo</span></div>
          )}
          {emp.projectRate > 0 && (
            <div><span className="text-slate-400 dark:text-slate-500">Rate: </span><span className="dark:text-slate-300">₹{emp.projectRate.toLocaleString()}/project</span></div>
          )}
          {emp.phone && <div><span className="text-slate-400 dark:text-slate-500">Phone: </span><span className="dark:text-slate-300">{emp.phone}</span></div>}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setAttendanceFor(emp)}
            className="flex-1 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
          >
            📋 Attendance
          </button>
          <button
            onClick={() => toggleActive(emp)}
            className={`text-xs px-3 py-2 rounded-lg font-semibold transition-colors border ${
              emp.isActive
                ? "bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/30"
                : "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30"
            }`}
          >
            {emp.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Employees & Freelancers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{active.length} active · {inactive.length} inactive</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/export/attendance?month=${currentMonth()}`}
            target="_blank"
            className="text-sm px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800 rounded-lg font-semibold transition-colors"
          >
            Export Attendance
          </a>
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg font-semibold transition-colors"
          >
            + Add Employee
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["ALL", "EMPLOYEE", "FREELANCER", "EMPLOYER"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filter === f ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-700 dark:border-slate-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
            }`}>
            {f === "ALL" ? "All" : MODE_LABELS[f as EmploymentMode]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {active.length === 0 && inactive.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-500 bg-white dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">No employees yet</p>
          <p className="text-sm dark:text-slate-400">Click "+ Add Employee" to get started.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {active.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Inactive</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactive.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
              </div>
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onAdded={emp => setEmployees(prev => [emp, ...prev])}
        />
      )}

      {attendanceFor && (
        <AttendanceModal employee={attendanceFor} onClose={() => setAttendanceFor(null)} />
      )}
    </div>
  );
}

