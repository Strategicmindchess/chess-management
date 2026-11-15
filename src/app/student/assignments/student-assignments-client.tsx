"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  ExternalLink, 
  BookOpen, 
  Filter,
  CheckCircle,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { updateAssignmentStatus, getStudentAssignments } from "@/actions/assignment-actions";
import { invalidateStudentAssignments, type AssignmentItem } from "@/hooks/use-student-assignments";
import { invalidateStudentMyClasses } from "@/hooks/use-student-my-classes";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  initialAssignments: AssignmentItem[];
  initialProgress: {
    total: number;
    score: number;
    percentage: number;
    pendingCount?: number;
    halfDoneCount?: number;
    completedCount?: number;
  };
  initialPagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function StudentAssignmentsClient({ 
  initialAssignments, 
  initialProgress,
  initialPagination 
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State
  const [assignments, setAssignments] = useState<AssignmentItem[]>(initialAssignments);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "HALF_DONE" | "FULLY_DONE" | "ALL">("PENDING");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(initialPagination.page);
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Overall Stats (cached counts)
  const [stats, setStats] = useState({
    total: initialProgress.total,
    score: initialProgress.score,
    percentage: initialProgress.percentage,
    pendingCount: initialProgress.pendingCount ?? 0,
    halfDoneCount: initialProgress.halfDoneCount ?? 0,
    completedCount: initialProgress.completedCount ?? 0,
  });

  // Track if this is initial mount
  const isMounted = useRef(false);

  // Fetch slice from server action (only 10 items at a time)
  const fetchSlice = async (
    targetStatus: "PENDING" | "HALF_DONE" | "FULLY_DONE" | "ALL",
    targetPage: number,
    targetType: string,
    targetSearch: string
  ) => {
    setIsLoading(true);
    try {
      const res = await getStudentAssignments({
        status: targetStatus,
        page: targetPage,
        limit: 10,
        type: targetType,
        search: targetSearch,
      });

      if (res.success && res.data) {
        setAssignments(res.data as any);
        if (res.progress) {
          setStats((prev) => ({
            ...prev,
            total: res.progress.total,
            score: res.progress.score,
            percentage: res.progress.percentage,
            pendingCount: res.progress.pendingCount ?? prev.pendingCount,
            halfDoneCount: res.progress.halfDoneCount ?? prev.halfDoneCount,
            completedCount: res.progress.completedCount ?? prev.completedCount,
          }));
        }
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error("Failed to load assignments slice:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch when tab or page changes (after initial mount)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    const timer = setTimeout(() => {
      fetchSlice(statusFilter, page, typeFilter, searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [statusFilter, page, typeFilter, searchQuery]);

  // Handle Tab Switch
  const handleTabChange = (newStatus: "PENDING" | "HALF_DONE" | "FULLY_DONE" | "ALL") => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  // Handle Status Update
  const handleStatusChange = async (
    assignmentId: string, 
    newLevel: "NOT_DONE" | "HALF_DONE" | "FULLY_DONE"
  ) => {
    setUpdatingId(assignmentId);
    try {
      const result = await updateAssignmentStatus(assignmentId, newLevel);
      if (result.success) {
        // Optimistic count adjustment
        const currentAssignment = assignments.find((a) => a.id === assignmentId);
        const oldLevel = currentAssignment?.completionLevel || "NOT_DONE";

        let pendingDiff = 0;
        let halfDoneDiff = 0;
        let completedDiff = 0;
        let scoreDiff = 0;

        // Deduct old
        if (oldLevel === "FULLY_DONE") {
          completedDiff -= 1;
          scoreDiff -= 1;
        } else if (oldLevel === "HALF_DONE") {
          halfDoneDiff -= 1;
          scoreDiff -= 0.5;
        } else {
          pendingDiff -= 1;
        }

        // Add new
        if (newLevel === "FULLY_DONE") {
          completedDiff += 1;
          scoreDiff += 1;
        } else if (newLevel === "HALF_DONE") {
          halfDoneDiff += 1;
          scoreDiff += 0.5;
        } else {
          pendingDiff += 1;
        }

        setStats((prev) => {
          const newScore = Math.max(0, prev.score + scoreDiff);
          return {
            ...prev,
            score: newScore,
            percentage: prev.total > 0 ? (newScore / prev.total) * 100 : 0,
            pendingCount: Math.max(0, prev.pendingCount + pendingDiff),
            halfDoneCount: Math.max(0, prev.halfDoneCount + halfDoneDiff),
            completedCount: Math.max(0, prev.completedCount + completedDiff),
          };
        });

        // Update card in place or filter out if in dedicated status tab
        if (statusFilter !== "ALL") {
          setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
          setPagination((prev) => ({
            ...prev,
            totalItems: Math.max(0, prev.totalItems - 1),
          }));
        } else {
          setAssignments((prev) =>
            prev.map((a) => {
              if (a.id === assignmentId) {
                return {
                  ...a,
                  completionLevel: newLevel,
                  status: newLevel === "FULLY_DONE" ? "COMPLETED" : "PENDING",
                  completedAt: newLevel === "FULLY_DONE" ? new Date().toISOString() : null,
                };
              }
              return a;
            })
          );
        }

        await Promise.all([
          invalidateStudentAssignments(),
          invalidateStudentMyClasses(),
        ]);
        router.refresh();
      } else {
        alert(result.error || "Failed to update assignment status.");
      }
    } catch (err: any) {
      alert(err.message || "Something went wrong.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case "PGN":
        return <Badge variant="brand" className="font-semibold text-[11px]">PGN</Badge>;
      case "HOMEWORK":
        return <Badge variant="warning" className="font-semibold text-[11px]">Homework</Badge>;
      case "PDF":
        return <Badge variant="neutral" className="font-semibold text-[11px]">PDF Study</Badge>;
      case "TEST_LINK":
        return <Badge variant="danger" className="font-semibold text-[11px]">Quiz / Test</Badge>;
      default:
        return <Badge variant="neutral" className="font-semibold text-[11px]">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 dark:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30 text-brand-700 dark:text-brand-300 text-xs font-bold tracking-widest uppercase rounded-full mb-3 shadow-xs">
            <GraduationCap className="w-3.5 h-3.5" />
            Learning Journey
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            My Assignments
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1.5 text-sm md:text-base">
            Solve homework puzzles, analyze PGNs, and boost your monthly performance score.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/student"
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href="/student/my-classes"
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/30 transition-colors"
          >
            My Classroom
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card (Highlighted first) */}
        <div 
          onClick={() => handleTabChange("PENDING")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            statusFilter === "PENDING"
              ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/50 shadow-md ring-2 ring-rose-500/20"
              : "bg-white dark:bg-[#11141c]/60 border-slate-200/90 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Pending (To Do)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.pendingCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Assignments waiting for you</p>
          </div>
        </div>

        {/* Half Completed Card */}
        <div 
          onClick={() => handleTabChange("HALF_DONE")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            statusFilter === "HALF_DONE"
              ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/50 shadow-md ring-2 ring-amber-500/20"
              : "bg-white dark:bg-[#11141c]/60 border-slate-200/90 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Half Done
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.halfDoneCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">0.5 credit granted</p>
          </div>
        </div>

        {/* Completed Card */}
        <div 
          onClick={() => handleTabChange("FULLY_DONE")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            statusFilter === "FULLY_DONE"
              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/50 shadow-md ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-[#11141c]/60 border-slate-200/90 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.completedCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Full marks earned</p>
          </div>
        </div>

        {/* Total Card */}
        <div 
          onClick={() => handleTabChange("ALL")}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            statusFilter === "ALL"
              ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-500/50 shadow-md ring-2 ring-blue-500/20"
              : "bg-white dark:bg-[#11141c]/60 border-slate-200/90 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Total Assigned
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">From all class lectures</p>
          </div>
        </div>
      </div>

      {/* Progress Banner */}
      <div className="rounded-2xl bg-white dark:bg-[#11141c]/60 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 p-6 relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-[60px] pointer-events-none -z-10" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              Overall Assignment Progress
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assignments directly count toward 100 Marks on your monthly leaderboard.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-brand-600 dark:text-brand-400">
              {stats.score} / {stats.total}
            </span>
            <span className="text-xs text-slate-500 ml-2 font-semibold">
              ({Math.round(stats.percentage)}%)
            </span>
          </div>
        </div>

        <div className="relative py-2">
          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-amber-500 dark:from-brand-600 dark:via-brand-400 dark:to-yellow-300 rounded-full transition-all duration-500"
              style={{ width: `${stats.total > 0 ? stats.percentage : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-[#11141c]/60 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => handleTabChange("PENDING")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === "PENDING"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Pending ({stats.pendingCount})
          </button>

          <button
            onClick={() => handleTabChange("HALF_DONE")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === "HALF_DONE"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Half Done ({stats.halfDoneCount})
          </button>

          <button
            onClick={() => handleTabChange("FULLY_DONE")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === "FULLY_DONE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Completed ({stats.completedCount})
          </button>

          <button
            onClick={() => handleTabChange("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            All ({stats.total})
          </button>
        </div>

        {/* Search & Type dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title or batch..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto h-8 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="ALL">All Types</option>
            <option value="PGN">PGN</option>
            <option value="HOMEWORK">Homework</option>
            <option value="PDF">PDF</option>
            <option value="TEST_LINK">Quiz / Test</option>
          </select>
        </div>
      </div>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-6 gap-2 text-xs text-brand-600 dark:text-brand-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading assignments (10 per page)...</span>
        </div>
      )}

      {/* Assignment Grid */}
      {!isLoading && assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-[#11141c]/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {statusFilter === "PENDING"
              ? "🎉 No pending assignments!"
              : "No assignments match your filter"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1">
            {statusFilter === "PENDING"
              ? "Great job! You have completed all released assignments."
              : "Try switching tabs or adjusting your search query."}
          </p>
          {statusFilter !== "ALL" && (
            <button
              onClick={() => handleTabChange("ALL")}
              className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              View All Assignments
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignments.map((assignment) => {
            const isCompleted = assignment.completionLevel === "FULLY_DONE";
            const isHalfDone = assignment.completionLevel === "HALF_DONE";
            const isUpdating = updatingId === assignment.id;

            return (
              <Card
                key={assignment.id}
                className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-slate-200/90 dark:border-slate-800 shadow-xs bg-white dark:bg-[#11141c]/80 backdrop-blur-xl flex flex-col group"
              >
                {/* Left accent color strip */}
                <div
                  className={`absolute top-0 left-0 w-1.5 h-full transition-colors ${
                    isCompleted
                      ? "bg-emerald-500"
                      : isHalfDone
                      ? "bg-amber-400"
                      : "bg-rose-400"
                  }`}
                />

                <CardHeader className="pb-3 pt-5 pl-6 pr-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      Lecture {assignment.lectureNumber || "—"}
                      {assignment.batchName && (
                        <span className="opacity-80 font-normal"> • {assignment.batchName}</span>
                      )}
                    </span>
                    {getResourceTypeBadge(assignment.type)}
                  </div>

                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {assignment.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pl-6 pr-5 pb-5 flex flex-col flex-1 justify-between">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 line-clamp-3 leading-relaxed">
                      {assignment.description || "Complete the practice exercises on Lichess or the linked resource."}
                    </p>

                    {/* Due Date & Release Info */}
                    <div className="space-y-1.5 mb-4 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {assignment.releasedAt && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" /> Released:
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {new Date(assignment.releasedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {assignment.dueDate && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> Due:
                          </span>
                          <span
                            className={`font-semibold ${
                              assignment.isOverdue && !isCompleted
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {new Date(assignment.dueDate).toLocaleDateString()}
                            {assignment.isOverdue && !isCompleted && " (Overdue)"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Control */}
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Status:
                      </span>
                      <Select
                        disabled={isUpdating}
                        value={assignment.completionLevel}
                        onChange={(e) =>
                          handleStatusChange(
                            assignment.id,
                            e.target.value as "NOT_DONE" | "HALF_DONE" | "FULLY_DONE"
                          )
                        }
                        className="w-[145px] h-8 text-xs bg-white dark:bg-[#1a1f2c] dark:border-slate-700 dark:text-white rounded-lg"
                      >
                        <option value="NOT_DONE">Pending</option>
                        <option value="HALF_DONE">Half Done (0.5)</option>
                        <option value="FULLY_DONE">Completed (1.0)</option>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-medium">
                        {isCompleted ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Full Marks
                          </span>
                        ) : isHalfDone ? (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Half Credit
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Not Done
                          </span>
                        )}
                      </span>

                      {assignment.url ? (
                        <a
                          href={assignment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/30 transition-all hover:scale-[1.02]"
                        >
                          Practice Link <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">No link provided</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 10 Items Per Page Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-6">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.totalItems)} of {pagination.totalItems} assignments (10 per page)
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              disabled={!pagination.hasMore || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-300"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
