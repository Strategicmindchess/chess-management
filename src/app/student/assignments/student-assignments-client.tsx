"use client";

import { useState, useMemo } from "react";
import { 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  ExternalLink, 
  BookOpen, 
  FileText, 
  Filter,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { updateAssignmentStatus } from "@/actions/assignment-actions";
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
  };
}

export function StudentAssignmentsClient({ initialAssignments, initialProgress }: Props) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<AssignmentItem[]>(initialAssignments);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "HALF_DONE" | "FULLY_DONE">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate live stats
  const stats = useMemo(() => {
    const total = assignments.length;
    let completedCount = 0;
    let halfDoneCount = 0;
    let pendingCount = 0;
    let totalScore = 0;

    assignments.forEach((a) => {
      if (a.completionLevel === "FULLY_DONE") {
        completedCount++;
        totalScore += 1;
      } else if (a.completionLevel === "HALF_DONE") {
        halfDoneCount++;
        totalScore += 0.5;
      } else {
        pendingCount++;
      }
    });

    const percentage = total > 0 ? (totalScore / total) * 100 : 0;

    return {
      total,
      completedCount,
      halfDoneCount,
      pendingCount,
      totalScore,
      percentage,
    };
  }, [assignments]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      // Status filter
      if (statusFilter === "PENDING" && a.completionLevel !== "NOT_DONE") return false;
      if (statusFilter === "HALF_DONE" && a.completionLevel !== "HALF_DONE") return false;
      if (statusFilter === "FULLY_DONE" && a.completionLevel !== "FULLY_DONE") return false;

      // Type filter
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(query);
        const matchesBatch = a.batchName.toLowerCase().includes(query);
        const matchesDesc = a.description?.toLowerCase().includes(query) ?? false;
        if (!matchesTitle && !matchesBatch && !matchesDesc) return false;
      }

      return true;
    });
  }, [assignments, statusFilter, typeFilter, searchQuery]);

  // Handle status update
  const handleStatusChange = async (assignmentId: string, newLevel: "NOT_DONE" | "HALF_DONE" | "FULLY_DONE") => {
    setUpdatingId(assignmentId);
    try {
      const result = await updateAssignmentStatus(assignmentId, newLevel);
      if (result.success) {
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

  // Helper for resource badge styling
  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case "PGN":
        return <Badge variant="brand" className="font-semibold">PGN Analysis</Badge>;
      case "HOMEWORK":
        return <Badge variant="warning" className="font-semibold">Homework</Badge>;
      case "PDF":
        return <Badge variant="neutral" className="font-semibold">PDF Study</Badge>;
      case "TEST_LINK":
        return <Badge variant="danger" className="font-semibold">Quiz / Test</Badge>;
      default:
        return <Badge variant="neutral" className="font-semibold">{type}</Badge>;
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
            Solve homework puzzles, analyze PGNs, and track your completion progress.
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

      {/* Progress & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Card */}
        <div className="rounded-2xl bg-white dark:bg-[#11141c]/60 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Assigned
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">From all batch lectures</p>
          </div>
        </div>

        {/* Completed Card */}
        <div className="rounded-2xl bg-white dark:bg-[#11141c]/60 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Fully Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.completedCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">100% score credited</p>
          </div>
        </div>

        {/* In Progress Card */}
        <div className="rounded-2xl bg-white dark:bg-[#11141c]/60 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Half Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.halfDoneCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">0.5 score credited</p>
          </div>
        </div>

        {/* Pending Card */}
        <div className="rounded-2xl bg-white dark:bg-[#11141c]/60 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Pending
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.pendingCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Action needed</p>
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
              Overall Assignment Score
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assignments contribute directly to your monthly leaderboard and performance marks.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-brand-600 dark:text-brand-400">
              {stats.totalScore} / {stats.total}
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

      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-[#11141c]/60 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "PENDING"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Pending ({stats.pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("HALF_DONE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "HALF_DONE"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Half Done ({stats.halfDoneCount})
          </button>
          <button
            onClick={() => setStatusFilter("FULLY_DONE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "FULLY_DONE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Completed ({stats.completedCount})
          </button>
        </div>

        {/* Search & Type dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assignments or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
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

      {/* Assignment Grid */}
      {filteredAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-[#11141c]/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {assignments.length === 0 ? "No assignments assigned yet" : "No assignments match your filter"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1">
            {assignments.length === 0
              ? "Your coach will assign practice puzzles and homework after class sessions are held."
              : "Try adjusting your search query or switching the status filter above."}
          </p>
          {assignments.length > 0 && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setTypeFilter("ALL");
                setSearchQuery("");
              }}
              className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssignments.map((assignment) => {
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
    </div>
  );
}
