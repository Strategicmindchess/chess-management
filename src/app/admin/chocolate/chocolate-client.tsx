"use client";

import { useState, useTransition } from "react";
import { updateChocolateClaimStatus } from "@/actions/chocolate-actions";
import { Trophy, Gift, Search, Edit2, Loader2, CheckCircle2, ChevronRight, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { format, subMonths } from "date-fns";

type ClaimData = {
  studentProfileId: string;
  studentName: string;
  month: string;
  totalPoints: number;
  maxPoints: number;
  rewardThreshold: number;
  isEligible: boolean;
  claimStatus: string;
  claimTicket: any;
};

const STATUS_OPTIONS = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "DISPATCHED",
  "DELIVERED"
];

const STATUS_COLORS: Record<string, string> = {
  NOT_CLAIMED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  SUBMITTED: "bg-brand-500/10 text-brand-400 border-brand-500/20",
  UNDER_REVIEW: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DISPATCHED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DELIVERED: "bg-emerald-600 text-white border-emerald-500",
};

export function AdminChocolateClient({
  initialData,
  currentMonth
}: {
  initialData: ClaimData[];
  currentMonth: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [filterEligible, setFilterEligible] = useState(false);
  const [isPending, startTransition] = useTransition();

  // For editing status
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editNote, setEditNote] = useState("");

  const months = Array.from({ length: 6 }).map((_, i) => format(subMonths(new Date(), i), "yyyy-MM"));

  function handleMonthChange(m: string) {
    router.push(`/admin/chocolate?month=${m}`);
  }

  function saveStatus(ticketId: string) {
    startTransition(async () => {
      const res = await updateChocolateClaimStatus(ticketId, editStatus as any, editNote);
      if (res.success) {
        setEditingTicketId(null);
        router.refresh();
        window.location.reload(); // Simple reload to get fresh data
      }
    });
  }

  const filtered = data.filter(d => {
    if (filterEligible && !d.isEligible) return false;
    if (search && !d.studentName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-3xl">🍫</span> Chocolate Rewards Management
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Track student marks and process physical chocolate reward deliveries.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-[#111723] rounded-lg border border-slate-700/50 p-1">
          {months.map(m => (
            <button
              key={m}
              onClick={() => handleMonthChange(m)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentMonth === m ? "bg-brand-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              {m === format(new Date(), "yyyy-MM") ? "Current" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-xl p-4">
          <p className="text-sm text-slate-400 font-medium">Total Students</p>
          <p className="text-2xl font-bold text-white mt-1">{data.length}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-sm text-emerald-400/80 font-medium">Eligible (≥{data[0]?.rewardThreshold ?? 38})</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{data.filter(d => d.isEligible).length}</p>
        </div>
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
          <p className="text-sm text-brand-400/80 font-medium">Claims Submitted</p>
          <p className="text-2xl font-bold text-brand-400 mt-1">{data.filter(d => d.claimTicket).length}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-400/80 font-medium">Delivered</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{data.filter(d => d.claimStatus === "DELIVERED").length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#111723] border border-slate-700 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={() => setFilterEligible(!filterEligible)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            filterEligible
              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
              : "bg-[#111723] border-slate-700 text-slate-300 hover:border-slate-500"
          }`}
        >
          <Filter className="w-4 h-4" />
          {filterEligible ? "Showing Eligible Only" : "Show Eligible Only"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#111723] rounded-xl border border-slate-700/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1a1f2e] text-slate-400 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Marks</th>
                <th className="px-5 py-3">Claim Status</th>
                <th className="px-5 py-3">Delivery Address</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    No records found for {currentMonth}
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.studentProfileId} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{row.studentName}</p>
                      {row.isEligible && <p className="text-[10px] text-emerald-400 mt-0.5 uppercase tracking-wider font-bold">Reward Unlocked</p>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${row.isEligible ? "text-emerald-400" : "text-white"}`}>
                          {row.totalPoints}
                        </span>
                        <span className="text-slate-500 text-xs">/ {row.maxPoints}</span>
                        {/* mini bar */}
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-2">
                          <div
                            className={`h-full ${row.isEligible ? "bg-emerald-500" : "bg-brand-500"}`}
                            style={{ width: `${Math.round((row.totalPoints / row.maxPoints) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {editingTicketId === row.claimTicket?.id && row.claimTicket ? (
                        <select
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value)}
                          className="bg-[#1a1f2e] border border-slate-600 text-white text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          STATUS_COLORS[row.claimStatus] || STATUS_COLORS.NOT_CLAIMED
                        }`}>
                          {row.claimStatus.replace(/_/g, " ")}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {row.claimTicket ? (
                        <div className="max-w-[250px]">
                          <p className="text-slate-300 truncate text-xs">{row.claimTicket.fullAddress}</p>
                          <p className="text-slate-500 text-[10px] truncate">{row.claimTicket.city}, {row.claimTicket.state} - {row.claimTicket.pincode}</p>
                          <p className="text-slate-400 text-[10px] mt-0.5">📞 {row.claimTicket.mobileNumber}</p>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">No claim submitted</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {row.claimTicket && (
                        editingTicketId === row.claimTicket.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingTicketId(null)}
                              className="text-xs text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveStatus(row.claimTicket.id)}
                              disabled={isPending}
                              className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50 flex items-center gap-1"
                            >
                              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingTicketId(row.claimTicket.id);
                              setEditStatus(row.claimStatus);
                              setEditNote(row.claimTicket.adminNote || "");
                            }}
                            className="text-slate-400 hover:text-brand-400 transition-colors p-1.5 rounded-md hover:bg-brand-500/10"
                            title="Update Status"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
