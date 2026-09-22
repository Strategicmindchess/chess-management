"use client";

import { useState, useTransition } from "react";
import { awardChocolateMarks } from "@/actions/chocolate-actions";
import { CheckCircle2, XCircle, Loader2, Trophy, AlertCircle } from "lucide-react";

type StudentMarkRow = {
  studentProfileId: string;
  studentName: string;
  batchName: string;
  totalPoints: number;
  maxPoints: number;
  rewardThreshold: number;
  isEligible: boolean;
  markedToday: boolean;
  todayPoints: number | null;
  todayCorrect: boolean | null;
};

function ProgressBar({ value, max, threshold }: { value: number; max: number; threshold: number }) {
  const pct = Math.round((value / max) * 100);
  const isNearThreshold = value >= threshold;
  return (
    <div className="w-full bg-slate-700/40 rounded-full h-2 overflow-hidden relative">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${
          isNearThreshold ? "bg-emerald-500" : value > 20 ? "bg-brand-500" : "bg-slate-500"
        }`}
        style={{ width: `${pct}%` }}
      />
      {/* Threshold marker at 38/40 */}
      <div
        className="absolute top-0 h-2 w-0.5 bg-white/40"
        style={{ left: `${(threshold / max) * 100}%` }}
      />
    </div>
  );
}

function StudentMarkCard({ student, onUpdated }: { student: StudentMarkRow; onUpdated: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const [localMarked, setLocalMarked] = useState(student.markedToday);
  const [localPts, setLocalPts] = useState(student.todayPoints);
  const [localTotal, setLocalTotal] = useState(student.totalPoints);

  function award(isCorrect: boolean) {
    setLocalError(null);
    startTransition(async () => {
      const res = await awardChocolateMarks(student.studentProfileId, isCorrect);
      if ("error" in res) {
        setLocalError(res.error ?? null);
      } else {
        setLocalMarked(true);
        setLocalPts(isCorrect ? 5 : -2);
        setLocalTotal(res.totalPoints);
        onUpdated();
      }
    });
  }

  const needMore = student.rewardThreshold - localTotal;

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      localTotal >= student.rewardThreshold
        ? "border-emerald-500/40 bg-emerald-500/5"
        : "border-slate-700/50 bg-[#1a1f2e]"
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-white text-sm">{student.studentName}</p>
          <p className="text-xs text-slate-500 mt-0.5">{student.batchName}</p>
        </div>
        {localTotal >= student.rewardThreshold ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            🍫 Eligible!
          </span>
        ) : (
          <span className="text-xs text-slate-500">{needMore > 0 ? `${needMore} more to chocolate` : ""}</span>
        )}
      </div>

      {/* Points + progress */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-400">Monthly marks</span>
          <span className={`text-sm font-bold ${localTotal >= student.rewardThreshold ? "text-emerald-400" : "text-white"}`}>
            {localTotal} <span className="text-slate-500 font-normal">/ {student.maxPoints}</span>
          </span>
        </div>
        <ProgressBar value={localTotal} max={student.maxPoints} threshold={student.rewardThreshold} />
      </div>

      {/* Today's status + buttons */}
      {localMarked ? (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
          localPts !== null && localPts > 0
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
        }`}>
          {localPts !== null && localPts > 0
            ? <><CheckCircle2 className="w-4 h-4" /> Correct answer marked today (+{localPts} pts)</>
            : <><XCircle className="w-4 h-4" /> Wrong answer marked today ({localPts} pts)</>
          }
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => award(true)}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            +5 Correct
          </button>
          <button
            onClick={() => award(false)}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            −2 Wrong
          </button>
        </div>
      )}

      {localError && (
        <p className="mt-2 text-xs text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {localError}
        </p>
      )}
    </div>
  );
}

export function CoachChocolatePanel({ initialStudents }: { initialStudents: StudentMarkRow[] }) {
  const [students, setStudents] = useState(initialStudents);

  if (students.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p className="font-medium text-slate-400">No students in your active batches.</p>
      </div>
    );
  }

  const eligible = students.filter(s => s.totalPoints >= s.rewardThreshold).length;
  const markedToday = students.filter(s => s.markedToday).length;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a1f2e] rounded-xl border border-slate-700/50 p-3 text-center">
          <p className="text-2xl font-bold text-white">{students.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Total Students</p>
        </div>
        <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{eligible}</p>
          <p className="text-xs text-slate-400 mt-0.5">🍫 Eligible</p>
        </div>
        <div className="bg-brand-500/5 rounded-xl border border-brand-500/20 p-3 text-center">
          <p className="text-2xl font-bold text-brand-400">{markedToday}</p>
          <p className="text-xs text-slate-400 mt-0.5">Marked Today</p>
        </div>
      </div>

      {/* Student cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {students.map(s => (
          <StudentMarkCard
            key={s.studentProfileId}
            student={s}
            onUpdated={() => {/* reloads handled via optimistic state */}}
          />
        ))}
      </div>

      <p className="text-xs text-slate-500 text-center pt-2">
        Each student can receive marks only once per class day.
        Threshold for 🍫 chocolate: {students[0]?.rewardThreshold ?? 38} marks.
      </p>
    </div>
  );
}
