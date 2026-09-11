"use client";

import type { EmployeePayoutSummary } from "@/actions/payout-actions";
import { useState } from "react";

const MODE_COLORS: Record<string, string> = {
  EMPLOYEE: "bg-blue-100 text-blue-800 border-blue-200",
  FREELANCER: "bg-purple-100 text-purple-800 border-purple-200",
  EMPLOYER: "bg-amber-100 text-amber-800 border-amber-200",
};

const INCENTIVE_COLORS: Record<string, string> = {
  BONUS: "text-emerald-600", INCENTIVE: "text-blue-600",
  DEDUCTION: "text-rose-600", ADVANCE: "text-amber-600",
};

export function EmployeePayoutCard({ emp }: { emp: EmployeePayoutSummary }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-[#11141c]/90 dark:backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-start justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-sm flex-shrink-0">
            {emp.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-900 dark:text-slate-100">{emp.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${MODE_COLORS[emp.employmentMode] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}>
                {emp.employmentMode}
              </span>
              {emp.tdsApplicable && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-semibold">TDS</span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{emp.jobRole} · {emp.employeeType.replace("_", " ")}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-500">₹{emp.netPayout.toLocaleString()}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Net payout</p>
          <span className="text-xs text-slate-400 mt-1 block">{expanded ? "▲ Hide" : "▼ Details"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-5 space-y-5 bg-slate-50/50">
          {/* Attendance summary */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Attendance</h4>
            <div className="flex gap-4 flex-wrap text-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-700"><span className="font-bold">{emp.presentDays}</span> Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-700"><span className="font-bold">{emp.absentDays}</span> Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-700"><span className="font-bold">{emp.halfDays}</span> Half Day</span>
              </div>
              {emp.overtimeBonus > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-slate-700">OT Bonus <span className="font-bold text-blue-700">₹{emp.overtimeBonus}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Payout calculation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payout Calculation</h4>
            <div className="space-y-2 text-sm">
              {emp.fixedSalary > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Fixed Salary</span>
                  <span className="font-semibold">₹{emp.fixedSalary.toLocaleString()}</span>
                </div>
              )}
              {emp.overtimeBonus > 0 && (
                <div className="flex justify-between text-blue-700">
                  <span>Overtime Bonus</span>
                  <span className="font-semibold">+₹{emp.overtimeBonus}</span>
                </div>
              )}
              {emp.totalIncentives !== 0 && (
                <div className={`flex justify-between ${emp.totalIncentives >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  <span>Incentives / Deductions</span>
                  <span className="font-semibold">{emp.totalIncentives >= 0 ? "+" : ""}₹{emp.totalIncentives}</span>
                </div>
              )}
              {emp.tdsAmount > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>TDS (10%)</span>
                  <span className="font-semibold">−₹{emp.tdsAmount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Net Payout</span>
                <span className="text-emerald-700 text-base">₹{emp.netPayout.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Incentives detail */}
          {emp.incentives.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Incentives / Deductions</h4>
              <div className="space-y-1.5">
                {emp.incentives.map(inc => (
                  <div key={inc.id} className="flex justify-between items-start text-xs">
                    <div>
                      <span className={`font-semibold uppercase text-xs ${INCENTIVE_COLORS[inc.type] ?? "text-slate-600"}`}>{inc.type}</span>
                      <span className="text-slate-500 ml-2">{inc.reason}</span>
                    </div>
                    <span className={`font-bold ${inc.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {inc.amount >= 0 ? "+" : ""}₹{inc.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

