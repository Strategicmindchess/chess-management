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
    <Card>
      <CardHeader className="bg-amber-50/80 pb-4 border-b border-amber-100">
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            My Performance Score
          </div>
          {entry?.rank && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Rank #{entry.rank}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
          </div>
        ) : entry ? (
          <>
            <div className="flex items-end gap-2 mb-6">
              <span className="text-4xl font-black text-slate-900 leading-none">
                {entry.totalScore}
              </span>
              <span className="text-sm font-medium text-slate-400 mb-1">
                / 500 pts
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Student Performance</span>
                <span className="font-semibold text-slate-700">{entry.studentPerfScore}/100</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Student Feedback</span>
                <span className="font-semibold text-slate-700">{entry.studentFeedScore}/200</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Class Quality</span>
                <span className="font-semibold text-slate-700">{entry.classQualityScore}/100</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Management Points</span>
                <span className="font-semibold text-slate-700">{entry.managementPoints}/100</span>
              </div>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-sm text-slate-500">
            No score calculated for this month yet.
          </div>
        )}

        <Link
          href="/teacher/leaderboard"
          className="flex w-full items-center justify-between rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 text-sm font-medium transition-colors shadow-sm"
        >
          <span>View Details</span>
          <ChevronRight className="h-4 w-4 text-amber-600" />
        </Link>
      </CardContent>
    </Card>
  );
}
