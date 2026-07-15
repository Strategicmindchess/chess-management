"use client";

import { useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { getBatchClassLogs } from "@/actions/class-log-actions";
import { AttendanceStatus } from "@/lib/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";

interface AttendanceViewerProps {
  batchId: string;
  batchName: string;
}

type ClassLog = {
  id: string;
  date: Date;
  topicCovered: string;
  durationMins: number;
  payoutAmount: number;
  coach: { user: { name: string } };
  attendance: {
    status: string;
    student: { user: { name: string } };
  }[];
};

export function AttendanceViewerDialog({ batchId, batchName }: AttendanceViewerProps) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ClassLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    const result = await getBatchClassLogs(batchId);
    if (!result.success) {
      setError(result.error || "Failed to fetch logs");
    } else {
      setLogs(result.data as ClassLog[]);
    }
    setLoading(false);
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={handleOpen}>
        <CalendarDays className="h-3.5 w-3.5" />
        View Attendance
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Attendance: ${batchName}`}
        description="View past class logs, topics covered, and student attendance."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No class logs have been recorded for this batch yet.
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 p-4 space-y-3 bg-white">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {new Date(log.date).toLocaleString([], { dateStyle: "long", timeStyle: "short" })}
                      </p>
                      <p className="text-sm text-slate-600 font-medium mt-1">
                        Topic: <span className="text-slate-800">{log.topicCovered}</span>
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <Badge variant="neutral">{log.durationMins} mins</Badge>
                      <p className="text-xs text-slate-500">Coach: {log.coach.user.name}</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-md p-3 border border-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Student Attendance
                    </p>
                    {log.attendance.length === 0 ? (
                      <p className="text-xs text-slate-400">No students enrolled</p>
                    ) : (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {log.attendance.map((att, i) => (
                          <li key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{att.student.user.name}</span>
                            <Badge variant={att.status === AttendanceStatus.PRESENT ? "success" : "danger"}>
                              {att.status === AttendanceStatus.PRESENT ? "Present" : "Absent"}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
