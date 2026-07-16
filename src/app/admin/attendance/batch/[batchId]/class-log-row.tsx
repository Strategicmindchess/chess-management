"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AttendanceRecordData = {
  id: string;
  status: string;
  student: {
    user: { name: string; id: string };
  };
};

type ClassLogData = {
  id: string;
  date: Date;
  topicCovered: string;
  coach: { user: { name: string } };
  attendance: AttendanceRecordData[];
};

export function ClassLogExpandableRow({ log }: { log: ClassLogData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const presentCount = log.attendance.filter(a => a.status === "PRESENT").length;
  const absentCount = log.attendance.filter(a => a.status === "ABSENT").length;

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors border-b border-slate-100">
        <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
          {format(new Date(log.date), "dd MMM yyyy")}
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
          {log.coach.user.name}
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
          {log.topicCovered || "—"}
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm">
          <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{presentCount}</span>
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm">
          <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-md">{absentCount}</span>
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-right">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-500 hover:text-brand-600"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {isExpanded ? "Hide" : "View"}
          </Button>
        </td>
      </tr>
      
      {isExpanded && (
        <tr className="bg-slate-50/80 border-b border-slate-200">
          <td colSpan={6} className="px-0 py-0">
            <div className="px-10 py-4 shadow-inner">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Student Attendance</h4>
              {log.attendance.length === 0 ? (
                <p className="text-sm text-slate-500">No attendance recorded for this class.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {log.attendance.map(record => (
                    <div key={record.id} className="flex justify-between items-center bg-white p-3 rounded-md border border-slate-200 shadow-sm">
                      <span className="text-sm font-medium text-slate-700">
                        {record.student.user.name}
                      </span>
                      <Badge variant={record.status === "PRESENT" ? "success" : "danger"} className="text-[10px]">
                        {record.status === "PRESENT" ? "Present" : "Absent"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
