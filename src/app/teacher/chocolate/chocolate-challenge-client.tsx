"use client";

import { useState, useTransition } from "react";
import { awardChocolateMarks } from "@/actions/chocolate-actions";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Trophy,
  AlertCircle,
  Search,
  Users,
  Gift,
  Star,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

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

// ── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  value,
  max,
  threshold,
  size = "md",
}: {
  value: number;
  max: number;
  threshold: number;
  size?: "sm" | "md" | "lg";
}) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  const thresholdPct = (threshold / max) * 100;
  const isEligible = value >= threshold;

  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" };

  return (
    <div className={`w-full bg-slate-800 rounded-full overflow-hidden relative ${heights[size]}`}>
      <div
        className={`${heights[size]} rounded-full transition-all duration-700 ease-out ${
          isEligible
            ? "bg-gradient-to-r from-emerald-500 to-yellow-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
            : value > 20
            ? "bg-gradient-to-r from-brand-500 to-brand-400"
            : "bg-slate-600"
        }`}
        style={{ width: `${pct}%` }}
      />
      {/* Chocolate threshold marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/50"
        style={{ left: `${thresholdPct}%` }}
        title={`Chocolate threshold: ${threshold}`}
      />
    </div>
  );
}

// ── Student Card ──────────────────────────────────────────────────────────────

function StudentMarkCard({
  student,
  onMarkAwarded,
}: {
  student: StudentMarkRow;
  onMarkAwarded: (id: string, totalPoints: number) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const [localMarked, setLocalMarked] = useState(student.markedToday);
  const [localPts, setLocalPts] = useState(student.todayPoints);
  const [localTotal, setLocalTotal] = useState(student.totalPoints);
  const [localEligible, setLocalEligible] = useState(student.isEligible);

  const needMore = Math.max(student.rewardThreshold - localTotal, 0);

  function award(isCorrect: boolean) {
    setLocalError(null);
    startTransition(async () => {
      const res = await awardChocolateMarks(student.studentProfileId, isCorrect);
      if ("error" in res) {
        setLocalError(res.error ?? null);
      } else {
        const pts = isCorrect ? 5 : -2;
        setLocalMarked(true);
        setLocalPts(pts);
        setLocalTotal(res.totalPoints);
        setLocalEligible(res.isEligible);
        onMarkAwarded(student.studentProfileId, res.totalPoints);
      }
    });
  }

  const isEligible = localEligible;

  return (
    <div
      className={`relative rounded-2xl border p-5 transition-all duration-300 overflow-hidden ${
        isEligible
          ? "border-emerald-500/40 bg-gradient-to-br from-emerald-900/20 to-[#1a1f2e] shadow-[0_0_30px_rgba(52,211,153,0.08)]"
          : "border-slate-700/50 bg-[#1a1f2e] hover:border-slate-600/70"
      }`}
    >
      {/* Eligible glow accent */}
      {isEligible && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4 relative">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border shrink-0 ${
              isEligible
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-slate-700/50 border-slate-600/50 text-slate-300"
            }`}
          >
            {student.studentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-tight">
              {student.studentName}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <Users className="w-3 h-3" /> {student.batchName}
            </p>
          </div>
        </div>

        {/* Status badge */}
        {isEligible ? (
          <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            🍫 Eligible
          </span>
        ) : needMore > 0 ? (
          <span className="shrink-0 text-[10px] text-slate-500 bg-slate-800/60 border border-slate-700/50 px-2.5 py-1 rounded-full">
            {needMore} more to 🍫
          </span>
        ) : null}
      </div>

      {/* Marks + progress */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span
              className={`text-2xl font-bold tabular-nums ${
                isEligible ? "text-emerald-400" : "text-white"
              }`}
            >
              {localTotal}
            </span>
            <span className="text-slate-500 text-sm ml-1">
              / {student.maxPoints}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {Math.round((localTotal / student.maxPoints) * 100)}%
          </span>
        </div>
        <ProgressBar
          value={localTotal}
          max={student.maxPoints}
          threshold={student.rewardThreshold}
          size="md"
        />
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-600">
          <span>0</span>
          <span className="text-amber-500/70">{student.rewardThreshold} 🍫</span>
          <span>{student.maxPoints}</span>
        </div>
      </div>

      {/* Today status / buttons */}
      {localMarked ? (
        <div
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border ${
            localPts !== null && localPts > 0
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}
        >
          {localPts !== null && localPts > 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Marked today — +{localPts} marks</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 shrink-0" />
              <span>Marked today — {localPts} marks</span>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => award(true)}
            disabled={isPending}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-semibold disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/30"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            +5 Correct
          </button>
          <button
            onClick={() => award(false)}
            disabled={isPending}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 active:scale-95 text-white text-sm font-semibold disabled:opacity-50 transition-all shadow-lg shadow-rose-900/30"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            −2 Wrong
          </button>
        </div>
      )}

      {localError && (
        <p className="mt-2.5 text-xs text-rose-400 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {localError}
        </p>
      )}
    </div>
  );
}

// ── Rules / Info Panel ────────────────────────────────────────────────────────

function RulesPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shrink-0">
          <Info className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-300">Marking Rules</p>
          <p className="text-xs text-slate-500">
            How the chocolate challenge works
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-amber-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-400" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-amber-500/10 pt-3">
          {[
            {
              icon: "✅",
              label: "Correct Answer",
              desc: "+5 marks added immediately",
            },
            {
              icon: "❌",
              label: "Wrong Answer",
              desc: "−2 marks deducted",
            },
            {
              icon: "🔒",
              label: "One per day",
              desc: "Each student can be marked only once per class day",
            },
            {
              icon: "📅",
              label: "Monthly reset",
              desc: "Marks reset to 0 at the start of every month",
            },
            {
              icon: "🏆",
              label: "Maximum marks",
              desc: "40 marks is the monthly cap",
            },
            {
              icon: "🍫",
              label: "Chocolate threshold",
              desc: "38 marks = student earns chocolate reward",
            },
          ].map((r) => (
            <div
              key={r.label}
              className="flex items-start gap-2 bg-[#1a1f2e]/60 rounded-lg p-3"
            >
              <span className="text-lg shrink-0">{r.icon}</span>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  {r.label}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────

export function ChocolateChallengeClient({
  initialStudents,
  currentMonth,
}: {
  initialStudents: StudentMarkRow[];
  currentMonth: string;
}) {
  const [students, setStudents] = useState(initialStudents);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "eligible" | "unmarked">("all");

  function handleMarkAwarded(studentId: string, totalPoints: number) {
    setStudents((prev) =>
      prev.map((s) =>
        s.studentProfileId === studentId
          ? {
              ...s,
              totalPoints,
              isEligible: totalPoints >= s.rewardThreshold,
              markedToday: true,
            }
          : s
      )
    );
  }

  // Filter & search
  const visible = students.filter((s) => {
    const matchSearch =
      !search ||
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.batchName.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "eligible" && s.isEligible) ||
      (filter === "unmarked" && !s.markedToday);
    return matchSearch && matchFilter;
  });

  // Summary stats (computed from live student state)
  const totalStudents = students.length;
  const eligibleCount = students.filter((s) => s.isEligible).length;
  const markedTodayCount = students.filter((s) => s.markedToday).length;
  const avgMarks =
    students.length > 0
      ? Math.round(
          students.reduce((sum, s) => sum + s.totalPoints, 0) / students.length
        )
      : 0;

  return (
    <div className="space-y-6 relative pb-10">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/3 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-amber-500/70 uppercase mb-2 flex items-center gap-2">
            <Gift className="w-3.5 h-3.5" /> Monthly Challenge
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            🍫 Chocolate Challenge
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Award marks to students for correct question answers.
            Reach 38 marks to unlock a chocolate reward.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#1a1f2e] border border-slate-700/50 rounded-xl px-4 py-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">{currentMonth}</span>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-slate-400" />
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Students</p>
          </div>
          <p className="text-3xl font-bold text-white">{totalStudents}</p>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-emerald-400/80 font-medium uppercase tracking-wider">Eligible 🍫</p>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{eligibleCount}</p>
        </div>

        <div className="bg-brand-500/5 border border-brand-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-brand-400" />
            <p className="text-xs text-brand-400/80 font-medium uppercase tracking-wider">Marked Today</p>
          </div>
          <p className="text-3xl font-bold text-brand-400">{markedTodayCount}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">of {totalStudents}</p>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <p className="text-xs text-amber-400/80 font-medium uppercase tracking-wider">Avg Marks</p>
          </div>
          <p className="text-3xl font-bold text-amber-400">{avgMarks}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">out of 40</p>
        </div>
      </div>

      {/* ── Rules Panel ── */}
      <RulesPanel />

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search student or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1f2e] border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-600"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          {(["all", "eligible", "unmarked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                filter === f
                  ? "bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-900/30"
                  : "bg-[#1a1f2e] border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
              }`}
            >
              {f === "all"
                ? `All (${totalStudents})`
                : f === "eligible"
                ? `Eligible 🍫 (${eligibleCount})`
                : `Unmarked Today (${totalStudents - markedTodayCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Student Grid ── */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trophy className="w-12 h-12 text-slate-700 mb-4" />
          <p className="font-semibold text-slate-400">
            {students.length === 0
              ? "No students in your active batches."
              : "No students match your search / filter."}
          </p>
          {students.length === 0 && (
            <p className="text-sm text-slate-600 mt-1">
              Students appear here once they are enrolled in your active batches.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((s) => (
            <StudentMarkCard
              key={s.studentProfileId}
              student={s}
              onMarkAwarded={handleMarkAwarded}
            />
          ))}
        </div>
      )}

      {/* ── Footer note ── */}
      {students.length > 0 && (
        <p className="text-xs text-slate-600 text-center flex items-center justify-center gap-1.5">
          <Star className="w-3 h-3" />
          Marks are one-per-student per class day. The +5 / −2 buttons lock after awarding.
        </p>
      )}
    </div>
  );
}
