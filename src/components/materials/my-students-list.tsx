"use client";

import { useState, useEffect } from "react";
import { Loader2, Users } from "lucide-react";
import { getCoachStudents } from "@/actions/batch-actions";
import { Badge } from "@/components/ui/badge";

export function MyStudentsList() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await getCoachStudents();
        if (res.success && res.students) {
          setStudents(res.students);
        } else {
          setError(res.error || "Failed to load students");
        }
      } catch (e) {
        setError("An error occurred while fetching students");
      } finally {
        setIsLoading(false);
      }
    }
    loadStudents();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-slate-500 dark:text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-600 dark:text-brand-400" />
        <p>Loading your students...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-red-500 p-6 text-center">
        <p>{error}</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-slate-500 dark:text-slate-400 p-8 text-center">
        <Users className="h-10 w-10 mb-4 text-slate-400 dark:text-slate-500" />
        <p>You don't have any students enrolled in your active batches.</p>
      </div>
    );
  }

  return (
    <div className="h-[500px] overflow-auto p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((student) => (
          <div key={student.id} className="p-4 rounded-xl border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#1a1f2e] hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold text-lg">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{student.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-32 sm:w-40">{student.email}</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-3">
              {student.chessComId && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Chess.com:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{student.chessComId}</span>
                </div>
              )}
              {student.lichessId && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Lichess:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{student.lichessId}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {student.batches.map((b: string) => (
                <Badge key={b} variant="neutral" className="text-[10px]">
                  {b}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
