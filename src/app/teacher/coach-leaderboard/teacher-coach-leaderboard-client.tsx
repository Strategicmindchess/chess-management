"use client";

import { useEffect, useState } from "react";
import { Trophy, RefreshCw, Medal, Award, Star, ChevronDown, ChevronUp, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CoachEntry {
  id: string;
  rank: number;
  coachProfileId: string;
  coachName: string;
  coachEmail: string;
  month: string;
  studentPerfScore: number;
  studentFeedScore: number;
  classQualityScore: number;
  managementPoints: number;
  managementNote: string | null;
  managementAwardedAt: string | null;
  managementAwardedBy: string | null;
  totalScore: number;
  totalClassesWithFeedback: number;
  totalFeedbackCount: number;
  calculatedAt: string;
}

const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/30",
  2: "bg-slate-50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-600/50",
  3: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-500/30",
};

const RANK_BADGE: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export function TeacherCoachLeaderboardClient() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [entries, setEntries] = useState<CoachEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/coach-leaderboard?month=${month}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [month]);

  // Generate last 6 months for selector
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    return { val, label };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            Coach Leaderboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            500 points total — 400 auto-calculated from class feedback + 100 management points
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white"
          >
            {monthOptions.map((m) => (
              <option key={m.val} value={m.val}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Score breakdown legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Student Performance", max: 100, color: "text-blue-600 bg-blue-50" },
          { label: "Student Feedback", max: 200, color: "text-violet-600 bg-violet-50" },
          { label: "Class Quality", max: 100, color: "text-emerald-600 bg-emerald-50" },
          { label: "Management Points", max: 100, color: "text-amber-600 bg-amber-50" },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl p-3 ${item.color} dark:bg-opacity-10 dark:text-opacity-80`}>
            <p className="text-xs font-semibold">{item.label}</p>
            <p className="text-lg font-bold">/{item.max}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No leaderboard data for {month}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            return (
              <div
                key={entry.coachProfileId}
                className={`rounded-xl border p-4 transition-all shadow-sm ${RANK_STYLES[entry.rank] ?? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Rank + Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xl w-8 text-center flex-shrink-0">
                      {RANK_BADGE[entry.rank] ?? `#${entry.rank}`}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{entry.coachName}</p>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="hidden sm:flex items-center gap-2 md:gap-4 text-center flex-shrink-0">
                    <div className="w-16">
                      <p className="text-xs text-slate-400">Perf</p>
                      <p className="font-bold text-blue-700">{entry.studentPerfScore}<span className="text-slate-400 font-normal">/100</span></p>
                    </div>
                    <div className="w-20">
                      <p className="text-xs text-slate-400">Feedback</p>
                      <p className="font-bold text-violet-700">{entry.studentFeedScore}<span className="text-slate-400 font-normal">/200</span></p>
                    </div>
                    <div className="w-16">
                      <p className="text-xs text-slate-400">Quality</p>
                      <p className="font-bold text-emerald-700">{entry.classQualityScore}<span className="text-slate-400 font-normal">/100</span></p>
                    </div>
                    <div className="w-16">
                      <p className="text-xs text-slate-400">Mgmt</p>
                      <p className={`font-bold ${entry.managementPoints > 0 ? "text-amber-700" : "text-slate-400"}`}>
                        {entry.managementPoints}<span className="text-slate-400 font-normal">/100</span>
                      </p>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <div className="text-right w-20">
                      <p className="text-xs text-slate-400">Total</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{entry.totalScore}<span className="text-sm text-slate-400 font-normal">/500</span></p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
