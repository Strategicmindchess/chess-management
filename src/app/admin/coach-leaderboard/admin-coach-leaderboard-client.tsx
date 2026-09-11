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
  1: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30",
  2: "bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700",
  3: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/30",
};

const RANK_BADGE: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export function AdminCoachLeaderboardClient() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [entries, setEntries] = useState<CoachEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [awardingId, setAwardingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [awardForm, setAwardForm] = useState<Record<string, { points: string; note: string }>>({});

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

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      await fetch("/api/admin/coach-leaderboard/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      await fetchData();
    } finally {
      setCalculating(false);
    }
  };

  const handleAwardPoints = async (coachProfileId: string) => {
    const form = awardForm[coachProfileId] ?? { points: "0", note: "" };
    const points = parseInt(form.points, 10);
    if (isNaN(points) || points < 0 || points > 100) {
      alert("Points must be between 0 and 100");
      return;
    }
    setAwardingId(coachProfileId);
    try {
      const res = await fetch(`/api/admin/coach-leaderboard/${coachProfileId}/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, points, note: form.note }),
      });
      if (res.ok) {
        await fetchData();
        setExpandedId(null);
      }
    } finally {
      setAwardingId(null);
    }
  };

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
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            500 points total — 400 auto-calculated from class feedback + 100 management points (award once/month)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:text-white"
          >
            {monthOptions.map((m) => (
              <option key={m.val} value={m.val}>{m.label}</option>
            ))}
          </select>
          <Button
            onClick={handleCalculate}
            disabled={calculating}
            className="bg-brand-600 hover:bg-brand-700 text-white"
          >
            {calculating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Recalculate
          </Button>
        </div>
      </div>

      {/* Score breakdown legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Student Performance", max: 100, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" },
          { label: "Student Feedback", max: 200, color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20" },
          { label: "Class Quality", max: 100, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Management Points", max: 100, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20" },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl p-3 ${item.color}`}>
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
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">No leaderboard data for {month}.</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Click Recalculate to generate scores.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.coachProfileId;
            const form = awardForm[entry.coachProfileId] ?? { points: String(entry.managementPoints), note: entry.managementNote ?? "" };

            return (
              <div
                key={entry.coachProfileId}
                className={`rounded-xl border p-4 transition-all ${RANK_STYLES[entry.rank] ?? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Rank + Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xl w-8 text-center flex-shrink-0">
                      {RANK_BADGE[entry.rank] ?? `#${entry.rank}`}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{entry.coachName}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{entry.coachEmail}</p>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="hidden sm:flex items-center gap-2 md:gap-4 text-center flex-shrink-0">
                    <div className="w-16">
                      <p className="text-xs text-slate-400">Perf</p>
                      <p className="font-bold text-blue-700 dark:text-blue-400">{entry.studentPerfScore}<span className="text-slate-400 dark:text-slate-500 font-normal">/100</span></p>
                    </div>
                    <div className="w-20">
                      <p className="text-xs text-slate-400">Feedback</p>
                      <p className="font-bold text-violet-700 dark:text-violet-400">{entry.studentFeedScore}<span className="text-slate-400 dark:text-slate-500 font-normal">/200</span></p>
                    </div>
                    <div className="w-16">
                      <p className="text-xs text-slate-400">Quality</p>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">{entry.classQualityScore}<span className="text-slate-400 dark:text-slate-500 font-normal">/100</span></p>
                    </div>
                    <div className="w-16">
                      <p className="text-xs text-slate-400">Mgmt</p>
                      <p className={`font-bold ${entry.managementPoints > 0 ? "text-amber-700 dark:text-amber-400" : "text-slate-400"}`}>
                        {entry.managementPoints}<span className="text-slate-400 dark:text-slate-500 font-normal">/100</span>
                      </p>
                    </div>
                  </div>

                  {/* Total + Award button */}
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <div className="text-right w-20">
                      <p className="text-xs text-slate-400">Total</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{entry.totalScore}<span className="text-sm text-slate-400 dark:text-slate-500 font-normal">/500</span></p>
                    </div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.coachProfileId)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Award Points
                      {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded award form */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800/30 space-y-3">
                    {entry.managementAwardedAt && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                        ⚠️ Already awarded by {entry.managementAwardedBy ?? "admin"} on{" "}
                        {new Date(entry.managementAwardedAt).toLocaleDateString("en-IN")}. Updating will overwrite.
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                          Management Points (0–100)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.points}
                          onChange={(e) =>
                            setAwardForm((prev) => ({
                              ...prev,
                              [entry.coachProfileId]: { ...form, points: e.target.value },
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex-[2]">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                          Note (optional — e.g. reason for points)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Extra effort in parent meetings"
                          value={form.note}
                          onChange={(e) =>
                            setAwardForm((prev) => ({
                              ...prev,
                              [entry.coachProfileId]: { ...form, note: e.target.value },
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={() => handleAwardPoints(entry.coachProfileId)}
                          disabled={awardingId === entry.coachProfileId}
                          className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
                        >
                          {awardingId === entry.coachProfileId ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Star className="w-4 h-4 mr-2" />
                          )}
                          Save Award
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
