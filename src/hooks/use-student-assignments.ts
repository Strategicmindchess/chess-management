import useSWR, { mutate } from "swr";

export const STUDENT_ASSIGNMENTS_KEY = "/api/student/assignments";

export type AssignmentItem = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  type: string;
  lectureNumber: number | null;
  batchName: string;
  status: "PENDING" | "COMPLETED" | "PREVIOUS";
  completionLevel: "NOT_DONE" | "HALF_DONE" | "FULLY_DONE";
  completedAt: Date | string | null;
  releasedAt: Date | string | null;
  dueDate: Date | string | null;
  isOverdue: boolean;
  remainingHours: number;
};

export type StudentAssignmentsResponse = {
  success: boolean;
  assignments: AssignmentItem[];
  progress: {
    total: number;
    score: number;
    percentage: number;
    pendingCount?: number;
    halfDoneCount?: number;
    completedCount?: number;
  };
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export function useStudentAssignments(options?: {
  status?: string;
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
}) {
  const query = new URLSearchParams();
  if (options?.status) query.set("status", options.status);
  if (options?.page) query.set("page", String(options.page));
  if (options?.limit) query.set("limit", String(options.limit));
  if (options?.type) query.set("type", options.type);
  if (options?.search) query.set("search", options.search);

  const key = `${STUDENT_ASSIGNMENTS_KEY}${query.toString() ? `?${query.toString()}` : ""}`;

  const { data, error, isLoading, mutate: refetch } = useSWR<StudentAssignmentsResponse>(key);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

export function invalidateStudentAssignments() {
  return mutate((key) => typeof key === "string" && key.startsWith(STUDENT_ASSIGNMENTS_KEY));
}
