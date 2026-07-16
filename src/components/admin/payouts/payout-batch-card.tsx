"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { getBatchClassLogs } from "@/actions/payout-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BatchCardProps = {
  batchId: string;
  batchName: string;
  coachName: string;
  totalSessions: number;
  totalPayout: number;
  monthString: string;
};

// Represents the return type of getBatchClassLogs roughly
type ClassLogData = {
  id: string;
  date: Date;
  topicCovered: string;
  durationMins: number;
  payoutAmount: number;
  attendance: { status: string }[];
};

export function PayoutBatchCard({
  batchId,
  batchName,
  coachName,
  totalSessions,
  totalPayout,
  monthString,
}: BatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<ClassLogData[] | null>(null);

  const handleToggle = async () => {
    if (!isExpanded && logs === null) {
      setIsLoading(true);
      try {
        const fetchedLogs = await getBatchClassLogs(batchId, monthString);
        setLogs(fetchedLogs);
      } catch (error) {
        console.error("Failed to load class logs", error);
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div 
        className="flex cursor-pointer items-center justify-between p-5 bg-white"
        onClick={handleToggle}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mr-4">
          <div>
            <p className="text-sm text-slate-500 font-medium">Batch Name</p>
            <p className="text-slate-900 font-semibold">{batchName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Sessions</p>
            <p className="text-slate-900">{totalSessions}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Coach Name</p>
            <p className="text-slate-900">{coachName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Payout</p>
            <p className="text-emerald-700 font-bold">₹{totalPayout.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex-shrink-0 text-slate-400">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />)}
        </div>
      </div>

      {isExpanded && (
        <div className="bg-slate-50/50 border-t border-slate-100 p-0">
          {logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-100/50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Topic</th>
                    <th className="px-5 py-3">Duration</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3 text-center">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const presentCount = log.attendance.filter(a => a.status === "PRESENT").length;
                    const totalCount = log.attendance.length;
                    
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-700">
                          {format(new Date(log.date), "dd MMM yyyy")}
                        </td>
                        <td className="px-5 py-3">{log.topicCovered || "—"}</td>
                        <td className="px-5 py-3">{log.durationMins} min</td>
                        <td className="px-5 py-3 text-emerald-600 font-medium">₹{log.payoutAmount}</td>
                        <td className="px-5 py-3 text-center text-slate-500">
                          {totalCount > 0 ? `${presentCount}/${totalCount}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5 text-center text-slate-500">
              No class details found for this month.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
