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
  classFeedbacks?: {
    id: string;
    student: { user: { name: string } };
    cameraOffOver5Min: boolean;
    phoneUsedOver4Times: boolean;
    classQualityScore: number | null;
  }[];
};

export function ClassLogExpandableRow({ log }: { log: ClassLogData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const presentCount = log.attendance.filter(a => a.status === "PRESENT").length;
  const absentCount = log.attendance.filter(a => a.status === "ABSENT").length;

  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800">
        <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
          {format(new Date(log.date), "dd MMM yyyy")}
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
          {log.coach.user.name}
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
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
            className="text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {isExpanded ? "Hide" : "View"}
          </Button>
        </td>
      </tr>
      
      {isExpanded && (
        <tr className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
          <td colSpan={6} className="px-0 py-0">
            <div className="px-10 py-4 shadow-inner dark:shadow-none border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Student Attendance</h4>
              {log.attendance.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No attendance recorded for this class.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {log.attendance.map(record => (
                    <div key={record.id} className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
            
            <div className="px-10 py-4 shadow-inner dark:shadow-none bg-slate-100/50 dark:bg-slate-900/60">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Student Feedbacks</h4>
              {!log.classFeedbacks || log.classFeedbacks.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No feedback submitted for this class.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {log.classFeedbacks.map(fb => (
                    <div key={fb.id} className="flex flex-col bg-white dark:bg-slate-900/50 p-3 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {fb.student.user.name}
                        </span>
                        {fb.classQualityScore !== null ? (
                          <Badge variant="neutral" className="text-[10px]">
                            {fb.classQualityScore}/5
                          </Badge>
                        ) : null}
                      </div>
                      {(fb.cameraOffOver5Min || fb.phoneUsedOver4Times) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {fb.cameraOffOver5Min && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded">
                              Camera Off &gt;5m
                            </span>
                          )}
                          {fb.phoneUsedOver4Times && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 rounded">
                              Phone Used &gt;4x
                            </span>
                          )}
                        </div>
                      )}
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
