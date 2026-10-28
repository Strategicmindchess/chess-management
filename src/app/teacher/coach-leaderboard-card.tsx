"use client";

import { useEffect, useState } from "react";
import { Trophy, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeaderboardEntry {
  month: string;
  totalScore: number;
  rank: number | null;
  studentPerfScore: number;
  studentFeedScore: number;
  classQualityScore: number;
  managementPoints: number;
}

export function CoachLeaderboardCard() {
  const [entry, setEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScore() {
      try {
        const res = await fetch("/api/teacher/coach-leaderboard");
        if (res.ok) {
          const data = await res.json();
          setEntry(data.entry);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchScore();
  }, []);

  return (
    <Card className="bg-white dark:bg-[#1a1f2e] border-slate-200/90 dark:border-slate-700/50">
      <CardHeader className="bg-amber-50/80 dark:bg-amber-950/20 pb-4 border-b border-amber-100 dark:border-amber-900/30">
        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            My Performance Score
          </div>
          {entry?.rank && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
              Rank #{entry.rank}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : entry ? (
          <>
            <div className="flex items-end gap-2 mb-6">
              <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">
                {entry.totalScore}
              </span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                / 500 pts
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Student Performance</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.studentPerfScore}/100</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Student Feedback</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.studentFeedScore}/200</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Class Quality</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.classQualityScore}/100</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Management Points</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.managementPoints}/100</span>
              </div>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No score calculated for this month yet.
          </div>
        )}

        <Link
          href="/teacher/leaderboard"
          className="flex w-full items-center justify-between rounded-lg bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-4 py-2 text-sm font-semibold transition-colors shadow-xs"
        >
          <span>View Details</span>
          <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </Link>
      </CardContent>
    </Card>
  );
}
